/**
 * Lead capture — persists inbound sales inquiries without coupling to the
 * tenant-scoped activity_logs table (those require a companyId, which we
 * don't have pre-conversion).
 *
 * Strategy:
 *   1. Append one JSONL row per lead to data/leads-YYYY-MM.jsonl (create
 *      the directory on first use). Survives process restarts, easy to grep.
 *   2. Emit a structured "[LEAD]" line to stdout so hosted log aggregation
 *      (Replit, Datadog, CloudWatch) picks it up.
 *   3. Try to send an email to sales@. If email isn't configured, the lead
 *      is still captured — we never lose a lead because SendPulse is down.
 *
 * We do NOT store the raw message in the email subject or in log lines that
 * might be piped to third parties — keep PII inside the JSONL file.
 */
import fs from "node:fs";
import path from "node:path";
import { sendEmail } from "./emailService";

const LEADS_DIR = path.resolve(process.cwd(), "data");
const SALES_INBOX = process.env.SALES_INBOX_EMAIL || "sales@prescient-labs.com";

export interface InboundLead {
  name: string;
  email: string;
  company?: string;
  role?: string;
  topic: string;
  message: string;
  // Request metadata — useful for abuse investigation, never for marketing.
  receivedAt: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
}

function ensureDir() {
  if (!fs.existsSync(LEADS_DIR)) {
    fs.mkdirSync(LEADS_DIR, { recursive: true });
  }
}

function leadsFileForNow(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return path.join(LEADS_DIR, `leads-${yyyy}-${mm}.jsonl`);
}

/**
 * Persist a lead to disk + log + (best-effort) email. Always returns
 * success=true unless disk write itself fails — we never want the caller
 * to fall back to mailto when we've already captured the lead.
 */
export async function captureLead(
  lead: InboundLead,
): Promise<{ ok: boolean; emailed: boolean }> {
  ensureDir();

  // 1. Persist to JSONL — one row, atomic-ish append.
  try {
    fs.appendFileSync(leadsFileForNow(), JSON.stringify(lead) + "\n", {
      encoding: "utf8",
    });
  } catch (err) {
    console.error("[LEAD] disk write failed:", err);
    return { ok: false, emailed: false };
  }

  // 2. Structured log — safe for aggregation (no message body).
  console.log(
    `[LEAD] topic=${lead.topic} email=${redactEmail(lead.email)} company=${
      lead.company || "-"
    } ip=${lead.ip || "-"}`,
  );

  // 3. Best-effort email to sales@. Never block on it.
  let emailed = false;
  try {
    const subject = `[${lead.topic}] Prescient Labs inquiry — ${
      lead.company || lead.name
    }`;
    const text = [
      `New inbound lead`,
      ``,
      `From:     ${lead.name} <${lead.email}>`,
      `Company:  ${lead.company || "(not provided)"}`,
      `Role:     ${lead.role || "(not provided)"}`,
      `Topic:    ${lead.topic}`,
      `Received: ${lead.receivedAt}`,
      `IP:       ${lead.ip || "-"}`,
      `Referer:  ${lead.referer || "-"}`,
      `UA:       ${lead.userAgent || "-"}`,
      ``,
      `Message:`,
      `--------`,
      lead.message,
    ].join("\n");
    const html = `<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;">${escapeHtml(
      text,
    )}</pre>`;

    const result = await sendEmail({
      to: [{ name: "Prescient Labs Sales", email: SALES_INBOX }],
      subject,
      text,
      html,
      from: { name: "Prescient Labs Website", email: "noreply@prescient-labs.com" },
    });
    emailed = result.success;
    if (!result.success) {
      console.warn(`[LEAD] email dispatch failed: ${result.error}`);
    }
  } catch (err) {
    // Swallow — lead is already persisted to disk; email is gravy.
    console.warn("[LEAD] email dispatch threw:", err);
  }

  return { ok: true, emailed };
}

function redactEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 2) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
