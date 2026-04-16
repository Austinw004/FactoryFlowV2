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

// Security headers — keep CSP off (Vite + Stripe + many third-party scripts);
// HSTS is set by upstream Replit/Vercel proxy. We still want frame protection,
// referrer policy, X-Content-Type-Options, etc.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// Permissions-Policy — not included in helmet 8, add manually
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Startup env validation — fail fast before binding port
(function validateEnv() {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) missing.push("JWT_SECRET or SESSION_SECRET");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    console.error(`[Startup] FATAL: missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
})();

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('DATABASE_URL not found, skipping Stripe initialization');
    return;
  }

  try {
    log('Initializing Stripe schema...');
    await runMigrations({ 
      databaseUrl,
      schema: 'stripe'
    });
    log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'Managed webhook for Manufacturing AI Stripe sync',
      }
    );
    log(`Webhook configured: ${webhook.url}`);

    log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        log('Stripe data synced');
      })
      .catch((err: any) => {
        console.error('Error syncing Stripe data:', err);
      });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

await initStripe();

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
  const server = await registerRoutes(app);

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    startBackgroundJobs();
  });

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
})();
