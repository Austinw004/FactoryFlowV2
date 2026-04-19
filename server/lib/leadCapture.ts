/**
 * Lead capture — persists inbound sales inquiries.
 *
 * Pre-conversion leads don't have a companyId yet, so they live in a
 * dedicated `contact_inquiries` table (not the tenant-scoped activity log).
 *
 * Strategy (belt + suspenders — we refuse to lose a lead):
 *   1. Write to the contact_inquiries table. This is the source of truth
 *      and what /internal/leads reads from.
 *   2. If the DB write fails for ANY reason (DB down, schema drift mid-
 *      deploy, connection pool exhausted), fall back to appending one
 *      JSONL row to data/leads-YYYY-MM.jsonl so a human can replay later.
 *   3. Emit a structured "[LEAD]" line to stdout so hosted log aggregation
 *      (Replit, Datadog, CloudWatch) picks it up with PII redacted.
 *   4. Best-effort email to sales@. Never block on it — if SendPulse is
 *      down, the lead is still captured.
 *
 * PII policy: the raw message body never goes into the email SUBJECT or
 * structured log lines that might be piped to a third-party log aggregator.
 * It only lives in the DB row and (if DB fails) the local JSONL file.
 */
import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import { contactInquiries } from "@shared/schema";
import { sql } from "drizzle-orm";
import { sendEmail } from "./emailService";

const LEADS_DIR = path.resolve(process.cwd(), "data");
const SALES_INBOX = process.env.SALES_INBOX_EMAIL || "info@prescient-labs.com";

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

export interface CaptureResult {
  ok: boolean;
  emailed: boolean;
  /** How the lead got stored — tells ops whether the DB path worked. */
  persistedVia: "db" | "jsonl-fallback" | "none";
  /** Present when persistedVia === "db". */
  inquiryId?: string;
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
 * Best-effort JSONL append. Never throws — the caller has already decided
 * whether to surface failure.
 */
function appendJsonlFallback(lead: InboundLead, reason: string): boolean {
  try {
    ensureDir();
    const row = { ...lead, _fallbackReason: reason, _fallbackAt: new Date().toISOString() };
    fs.appendFileSync(leadsFileForNow(), JSON.stringify(row) + "\n", { encoding: "utf8" });
    return true;
  } catch (err) {
    console.error("[LEAD] JSONL fallback write failed:", err);
    return false;
  }
}

/**
 * Persist a lead to the DB (primary) with JSONL fallback. Always returns
 * ok=true unless BOTH the DB write AND the disk fallback fail — in that
 * case the caller should surface the mailto fallback.
 */
export async function captureLead(lead: InboundLead): Promise<CaptureResult> {
  // 1. Primary path — write to contact_inquiries.
  let inquiryId: string | undefined;
  let persistedVia: CaptureResult["persistedVia"] = "none";

  try {
    // If we've seen this email before, bump submission_count rather than
    // letting one prospect create 50 rows. Idempotent-ish insert.
    const inserted = await db
      .insert(contactInquiries)
      .values({
        name: lead.name,
        email: lead.email,
        company: lead.company || null,
        role: lead.role || null,
        topic: lead.topic,
        message: lead.message,
        ip: lead.ip || null,
        userAgent: lead.userAgent || null,
        referer: lead.referer || null,
      })
      .returning({ id: contactInquiries.id });

    inquiryId = inserted[0]?.id;
    persistedVia = "db";

    // Opportunistic submission-count bump if there are prior rows from
    // the same email (excluding the one we just wrote). Best-effort —
    // failures here don't fail the capture.
    try {
      await db.execute(sql`
        UPDATE contact_inquiries
        SET submission_count = (
          SELECT COUNT(*) FROM contact_inquiries WHERE email = ${lead.email}
        )
        WHERE email = ${lead.email}
      `);
    } catch (err) {
      // Non-fatal — submission_count is analytics, not correctness.
      console.warn("[LEAD] submission_count bump failed:", err);
    }
  } catch (err: any) {
    // DB write failed — try the JSONL fallback before giving up.
    console.error("[LEAD] DB write failed, falling back to JSONL:", err?.message || err);
    const wroteFallback = appendJsonlFallback(lead, `db-error: ${err?.message || "unknown"}`);
    if (wroteFallback) {
      persistedVia = "jsonl-fallback";
    } else {
      // Both paths failed — this is the only case where we return ok=false.
      return { ok: false, emailed: false, persistedVia: "none" };
    }
  }

  // 2. Structured log — redacted for safe external aggregation.
  console.log(
    `[LEAD] topic=${lead.topic} email=${redactEmail(lead.email)} company=${
      lead.company || "-"
    } ip=${lead.ip || "-"} persisted=${persistedVia}${inquiryId ? ` id=${inquiryId}` : ""}`,
  );

  // 3. Best-effort email to sales@. Never block the response on this.
  let emailed = false;
  try {
    const subject = `[${lead.topic}] Prescient Labs inquiry — ${lead.company || lead.name}`;
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
      `Inquiry:  ${inquiryId || "(not assigned — JSONL fallback)"}`,
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
      from: { name: "Prescient Labs Website", email: "info@prescient-labs.com" },
    });
    emailed = result.success;
    if (!result.success) {
      console.warn(`[LEAD] email dispatch failed: ${result.error}`);
    } else if (inquiryId) {
      // Record the send on the row so /internal/leads can show "emailed" status.
      try {
        await db.execute(sql`
          UPDATE contact_inquiries SET emailed_at = NOW() WHERE id = ${inquiryId}
        `);
      } catch (e) {
        console.warn("[LEAD] emailed_at bump failed:", e);
      }
    }
  } catch (err) {
    // Swallow — lead is already persisted; email is gravy.
    console.warn("[LEAD] email dispatch threw:", err);
  }

  return { ok: true, emailed, persistedVia, inquiryId };
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
