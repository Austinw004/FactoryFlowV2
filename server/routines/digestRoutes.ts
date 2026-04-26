// Express routes for the daily routine digest.
//
// POST /api/routines/digest/run        — admin-only, triggers a digest run now
// GET  /api/routines/digest/:token/confirm/:changeId  — token-link, approves a change
// GET  /api/routines/digest/:token/reject/:changeId   — token-link, rejects a change
// GET  /api/routines/digest/:token/prompt             — html form to reply with changes
// POST /api/routines/digest/:token/prompt             — accepts the free-form prompt
//
// The token-link endpoints don't require login: they're authenticated by the
// random 256-bit confirmToken on the digest row, so users can act directly
// from the email client.

import type { Express, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { runDigestRoutine, resolveChange, recordPromptResponse } from "./digestRoutine";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal HTML page used for the confirmation/rejection landing screens and
// the "reply with changes" form. Matches the marketing site palette.
function statusPage(opts: {
  title: string;
  body: string;
  tone?: "ok" | "error" | "neutral";
}): string {
  const accent =
    opts.tone === "error" ? "#B5443A" : opts.tone === "ok" ? "#2C7A4F" : "#0A0B0D";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(opts.title)} · Prescient Labs</title>
<style>
  body{margin:0;padding:48px 16px;background:#F2F2F2;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Helvetica,Arial,sans-serif;color:#0A0B0D;}
  .card{max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;box-shadow:0 1px 2px rgba(0,0,0,0.04);}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6A6E76;margin-bottom:8px;}
  h1{margin:0 0 12px 0;font-size:22px;line-height:1.2;color:${accent};font-weight:700;letter-spacing:-0.01em;}
  p{margin:8px 0;font-size:15px;color:#3A3D44;line-height:1.5;}
  textarea{width:100%;box-sizing:border-box;min-height:160px;padding:12px;font-family:inherit;font-size:14px;border:1px solid #D5D6D9;border-radius:8px;resize:vertical;}
  button{margin-top:14px;padding:10px 18px;background:#CC785C;color:#FFFFFF;border:0;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;}
  a.secondary{display:inline-block;margin-top:14px;font-size:13px;color:#6A6E76;text-decoration:underline;}
</style></head>
<body><div class="card"><div class="label">Prescient Labs · Routine Digest</div>${opts.body}</div></body></html>`;
}

// Public token-link routes (confirm, reject, prompt-back). Must be registered
// BEFORE the global app.use('/api', requireAuth) gate in routes.ts so they
// remain reachable from a user's email client without re-auth. The 256-bit
// random confirmToken on each digest row is the authentication.
export function registerDigestPublicRoutes(app: Express) {
  // ----------------------------------------------------------- confirm link
  app.get(
    "/api/routines/digest/:token/confirm/:changeId",
    async (req: Request, res: Response) => {
      const { token, changeId } = req.params;
      const result = await resolveChange({
        confirmToken: token,
        changeId,
        decision: "approved",
      });
      if (!result.ok) {
        return res.status(404).send(
          statusPage({
            title: "Couldn't approve",
            tone: "error",
            body: `<h1>Couldn't approve that change</h1><p>${escapeHtml(result.reason)}</p>`,
          }),
        );
      }
      return res.send(
        statusPage({
          title: "Approved",
          tone: "ok",
          body: `<h1>Change approved</h1>
<p>“${escapeHtml(result.change.title)}” has been recorded as approved. The next routine run will pick it up.</p>`,
        }),
      );
    },
  );

  // ------------------------------------------------------------ reject link
  app.get(
    "/api/routines/digest/:token/reject/:changeId",
    async (req: Request, res: Response) => {
      const { token, changeId } = req.params;
      const result = await resolveChange({
        confirmToken: token,
        changeId,
        decision: "rejected",
      });
      if (!result.ok) {
        return res.status(404).send(
          statusPage({
            title: "Couldn't reject",
            tone: "error",
            body: `<h1>Couldn't reject that change</h1><p>${escapeHtml(result.reason)}</p>`,
          }),
        );
      }
      return res.send(
        statusPage({
          title: "Rejected",
          tone: "neutral",
          body: `<h1>Change rejected</h1>
<p>“${escapeHtml(result.change.title)}” will not be applied. You're done — close this tab.</p>`,
        }),
      );
    },
  );

  // ----------------------------------------------- prompt-back form (GET)
  app.get(
    "/api/routines/digest/:token/prompt",
    async (req: Request, res: Response) => {
      const { token } = req.params;
      return res.send(
        statusPage({
          title: "Reply with changes",
          tone: "neutral",
          body: `<h1>Reply with changes</h1>
<p>Tell me what you'd like changed. The team will review and update on the next run.</p>
<form method="POST" action="/api/routines/digest/${escapeHtml(token)}/prompt">
  <textarea name="prompt" placeholder="e.g. Drop the workforce metrics routine, add an alert when commodity prices move >5% in a day, and run the digest at 7am instead of 8am." required></textarea>
  <div><button type="submit">Send to operator</button></div>
</form>`,
        }),
      );
    },
  );

  // ----------------------------------------------- prompt-back form (POST)
  app.post(
    "/api/routines/digest/:token/prompt",
    async (req: Request, res: Response) => {
      const { token } = req.params;
      const prompt: string | undefined =
        req.body?.prompt && typeof req.body.prompt === "string"
          ? req.body.prompt.trim()
          : undefined;
      if (!prompt || prompt.length < 4) {
        return res.status(400).send(
          statusPage({
            title: "Empty",
            tone: "error",
            body: `<h1>Add a few words</h1><p>Tell me what you'd like changed and try again.</p>`,
          }),
        );
      }
      if (prompt.length > 5000) {
        return res.status(400).send(
          statusPage({
            title: "Too long",
            tone: "error",
            body: `<h1>That's a lot</h1><p>Keep it under 5,000 characters.</p>`,
          }),
        );
      }
      const result = await recordPromptResponse({
        confirmToken: token,
        prompt,
      });
      if (!result.ok) {
        return res.status(404).send(
          statusPage({
            title: "Couldn't record",
            tone: "error",
            body: `<h1>Couldn't record that</h1><p>${escapeHtml(result.reason)}</p>`,
          }),
        );
      }
      return res.send(
        statusPage({
          title: "Got it",
          tone: "ok",
          body: `<h1>Got it</h1><p>Thanks — the operator will see this and apply changes on the next run.</p>`,
        }),
      );
    },
  );
}

// Authenticated routes (admin-triggered run). Registered AFTER the global
// auth gate.
export function registerDigestRoutes(app: Express) {
  // ---------------------------------------------------------------- run now
  app.post("/api/routines/digest/run", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId: string | undefined =
        req.jwtUser?.sub ?? req.user?.claims?.sub ?? req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      // Optional: only allow admins. Skip the role check for now since the
      // call site is the user's own dashboard. When this is exposed to
      // other surfaces, wrap with requirePermission('manage_automations').
      const sendEmail = req.body?.dryRun !== true;
      const digest = await runDigestRoutine({
        userId,
        companyId: user.companyId ?? null,
        sendEmail,
      });
      return res.json({
        ok: true,
        digestId: digest.id,
        emailSentAt: digest.emailSentAt,
        proposedChanges: digest.proposedChanges,
        routineResults: digest.routineResults,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Digest] run failed:", message);
      return res.status(500).json({ error: message });
    }
  });

  // ----------------------------------------------------------- confirm link
  app.get(
    "/api/routines/digest/:token/confirm/:changeId",
    async (req: Request, res: Response) => {
      const { token, changeId } = req.params;
      const result = await resolveChange({
        confirmToken: token,
        changeId,
        decision: "approved",
      });
      if (!result.ok) {
        return res.status(404).send(
          statusPage({
            title: "Couldn't approve",
            tone: "error",
            body: `<h1>Couldn't approve that change</h1><p>${escapeHtml(result.reason)}</p>`,
          }),
        );
      }
      return res.send(
        statusPage({
          title: "Approved",
          tone: "ok",
          body: `<h1>Change approved</h1>
<p>“${escapeHtml(result.change.title)}” has been recorded as approved. The next routine run will pick it up.</p>`,
        }),
      );
    },
  );

  // ------------------------------------------------------------ reject link
  app.get(
    "/api/routines/digest/:token/reject/:changeId",
    async (req: Request, res: Response) => {
      const { token, changeId } = req.params;
      const result = await resolveChange({
        confirmToken: token,
        changeId,
        decision: "rejected",
      });
      if (!result.ok) {
        return res.status(404).send(
          statusPage({
            title: "Couldn't reject",
            tone: "error",
            body: `<h1>Couldn't reject that change</h1><p>${escapeHtml(result.reason)}</p>`,
          }),
        );
      }
      return res.send(
        statusPage({
          title: "Rejected",
          tone: "neutral",
          body: `<h1>Change rejected</h1>
<p>“${escapeHtml(result.change.title)}” will not be applied. You're done — close this tab.</p>`,
        }),
      );
    },
  );

  // ----------------------------------------------- prompt-back form (GET)
  app.get(
    "/api/routines/digest/:token/prompt",
    async (req: Request, res: Response) => {
      const { token } = req.params;
      return res.send(
        statusPage({
          title: "Reply with changes",
          tone: "neutral",
          body: `<h1>Reply with changes</h1>
<p>Tell me what you'd like changed. The team will review and update on the next run.</p>
<form method="POST" action="/api/routines/digest/${escapeHtml(token)}/prompt">
  <textarea name="prompt" placeholder="e.g. Drop the workforce metrics routine, add an alert when commodity prices move >5% in a day, and run the digest at 7am instead of 8am." required></textarea>
  <div><button type="submit">Send to operator</button></div>
</form>`,
        }),
      );
    },
  );

  // ----------------------------------------------- prompt-back form (POST)
  app.post(
    "/api/routines/digest/:token/prompt",
    async (req: Request, res: Response) => {
      const { token } = req.params;
      // Accept either application/json or x-www-form-urlencoded.
      const prompt: string | undefined =
        req.body?.prompt && typeof req.body.prompt === "string"
          ? req.body.prompt.trim()
          : undefined;
      if (!prompt || prompt.length < 4) {
        return res.status(400).send(
          statusPage({
            title: "Empty",
            tone: "error",
            body: `<h1>Add a few words</h1><p>Tell me what you'd like changed and try again.</p>`,
          }),
        );
      }
      if (prompt.length > 5000) {
        return res.status(400).send(
          statusPage({
            title: "Too long",
            tone: "error",
            body: `<h1>That's a lot</h1><p>Keep it under 5,000 characters.</p>`,
          }),
        );
      }
      const result = await recordPromptResponse({
        confirmToken: token,
        prompt,
      });
      if (!result.ok) {
        return res.status(404).send(
          statusPage({
            title: "Couldn't record",
            tone: "error",
            body: `<h1>Couldn't record that</h1><p>${escapeHtml(result.reason)}</p>`,
          }),
        );
      }
      return res.send(
        statusPage({
          title: "Got it",
          tone: "ok",
          body: `<h1>Got it</h1><p>Thanks — the operator will see this and apply changes on the next run.</p>`,
        }),
      );
    },
  );
}
