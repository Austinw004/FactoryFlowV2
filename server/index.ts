import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startBackgroundJobs, stopBackgroundJobs } from "./backgroundJobs";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';

const app = express();
app.use(compression());
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security headers — keep CSP off here (set by securityHeadersMiddleware
// in server/lib/securityHardening.ts which has the full directive list
// including frame-ancestors). HSTS is set by upstream Replit proxy.
//
// CRITICAL: frameguard MUST be disabled. Helmet's default sends
// X-Frame-Options: SAMEORIGIN, which Replit's Preview tab can't satisfy
// (it iframes us from a different replit.app subdomain) and breaks the
// IDE preview with a 403. Clickjacking is still prevented by the
// Content-Security-Policy frame-ancestors directive in securityHardening.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: false,
  }),
);
// Permissions-Policy is set by securityHeadersMiddleware in
// server/lib/securityHardening.ts (registered via applySecurityHardening
// during registerRoutes). Keeping a single source of truth avoids the
// later middleware silently overwriting an earlier value with a narrower one.

// Startup env validation — fail fast before binding port.
// Loud logs so we can see the boot sequence in production log tail.
(function validateEnv() {
  console.log(`[Startup] NODE_ENV=${process.env.NODE_ENV || 'development'} PORT=${process.env.PORT || '5000'}`);
  const missing: string[] = [];
  if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) missing.push("JWT_SECRET or SESSION_SECRET");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.ENCRYPTION_KEY) missing.push("ENCRYPTION_KEY");
  if (missing.length > 0) {
    console.error(`[Startup] FATAL: missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  const rawKey = (process.env.ENCRYPTION_KEY ?? '').trim();
  if (rawKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    console.error(
      `[Startup] FATAL: ENCRYPTION_KEY must be exactly 64 hex chars. ` +
      `Got length=${rawKey.length}. Generate with: openssl rand -hex 32`,
    );
    process.exit(1);
  }
  console.log('[Startup] Environment validation passed');
})();

/**
 * Initialize Stripe (schema migrations + managed webhook + backfill).
 *
 * IMPORTANT: this must NOT block the server from binding a port. In previous
 * deploys this was awaited at module top-level and hung forever when the
 * Stripe webhook API was slow or REPLIT_DOMAINS was unset — autoscale would
 * then kill the instance for failing health checks.
 *
 * Now it's fire-and-forget after the port is bound, wrapped in a hard timeout.
 */
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[Stripe] DATABASE_URL not set, skipping Stripe initialization');
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[Stripe] STRIPE_SECRET_KEY not set, skipping Stripe initialization');
    return;
  }

  const domain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  if (!domain) {
    console.log('[Stripe] REPLIT_DOMAINS not set, skipping managed webhook registration');
    return;
  }

  try {
    console.log('[Stripe] Running schema migrations...');
    await runMigrations({ databaseUrl } as any);
    console.log('[Stripe] Schema ready');

    const stripeSync = await getStripeSync();

    console.log('[Stripe] Ensuring managed webhook...');
    const webhookBaseUrl = `https://${domain}`;
    const { webhook } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'Managed webhook for Manufacturing AI Stripe sync',
      }
    );
    console.log(`[Stripe] Webhook configured: ${webhook.url}`);

    // Backfill is already non-blocking internally; log but never crash.
    stripeSync.syncBackfill()
      .then(() => console.log('[Stripe] Backfill complete'))
      .catch((err: any) => console.error('[Stripe] Backfill error:', err?.message || err));
  } catch (error: any) {
    console.error('[Stripe] Initialization failed (non-fatal):', error?.message || error);
  }
}

/** Wrap a promise with a timeout so a hung dependency cannot block boot. */
function withTimeout<T>(label: string, ms: number, p: Promise<T>): Promise<T | void> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      console.error(`[Startup] ${label} timed out after ${ms}ms (non-fatal)`);
      resolve();
    }, ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((err) => {
       clearTimeout(t);
       console.error(`[Startup] ${label} failed (non-fatal):`, err?.message || err);
       resolve();
     });
  });
}

app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('Invalid webhook') || msg.includes('unparseable')) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }
      if (msg.includes('signature') || msg.includes('Signature')) {
        return res.status(401).json({ error: 'Webhook signature verification failed' });
      }
      console.error('Webhook processing error:', msg);
      res.status(200).json({ received: true });
    }
  }
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('[Startup] Registering routes...');
    const server = await registerRoutes(app);
    console.log('[Startup] Routes registered');

    app.use((err: any, req: any, res: any, next: any) => {
      console.error('[Server Error]', err.stack || err.message || err);
      const isProduction = process.env.NODE_ENV === 'production';
      const status = err.status || 500;
      res.status(status).json({
        message: isProduction ? 'Internal server error' : (err.message || 'Internal Server Error'),
        ...(isProduction ? {} : { stack: err.stack })
      });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log('[Startup] Setting up Vite dev server...');
      await setupVite(app, server);
    } else {
      console.log('[Startup] Serving static assets...');
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    console.log(`[Startup] Binding to 0.0.0.0:${port}...`);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`[Startup] Listening on 0.0.0.0:${port} — ready for traffic`);
      log(`serving on port ${port}`);

      // Kick off async initializers AFTER the port is bound so health checks
      // succeed immediately. Each is wrapped in a timeout so a slow/hung
      // dependency (Stripe API, background job) cannot take the server down.
      withTimeout('Stripe init', 20_000, initStripe());

      try {
        startBackgroundJobs();
        console.log('[Startup] Background jobs started');
      } catch (err: any) {
        console.error('[Startup] Background jobs error (non-fatal):', err?.message || err);
      }
    });

    server.on('error', (err: any) => {
      console.error('[Startup] server.listen error:', err?.message || err);
      process.exit(1);
    });
  } catch (err: any) {
    console.error('[Startup] FATAL during boot:', err?.stack || err?.message || err);
    process.exit(1);
  }

  process.on('SIGTERM', () => {
    log('SIGTERM received, stopping background jobs...');
    stopBackgroundJobs();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    log('SIGINT received, stopping background jobs...');
    stopBackgroundJobs();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('[Server] Unhandled promise rejection:', reason?.message || reason);
  });

  process.on('uncaughtException', (err: any) => {
    console.error('[Server] Uncaught exception:', err?.stack || err?.message || err);
  });
})();
