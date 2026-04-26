// HTML email template for the weekly routine digest. Each proposed change
// gets one-click confirm/reject links signed by the digest's confirmToken.
//
// Design: Inter font, ink/bone palette to match the marketing site, signal
// (#CC785C) for the primary action button. Plain-text fallback included.

import { sendEmail } from "../lib/emailService";
import type { RoutineResult, ProposedChange } from "@shared/schema";

function publicBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "https://prescient-labs.com";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusBadge(status: RoutineResult["status"]): string {
  const colors: Record<RoutineResult["status"], { bg: string; fg: string; label: string }> = {
    ok: { bg: "#E8F5EE", fg: "#2C7A4F", label: "Ran cleanly" },
    error: { bg: "#FCEEEA", fg: "#B5443A", label: "Failed" },
    skipped: { bg: "#F2F2F2", fg: "#6A6E76", label: "Skipped" },
  };
  const c = colors[status];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${c.bg};color:${c.fg};font-size:12px;font-weight:600;">${c.label}</span>`;
}

function renderResultsTable(results: RoutineResult[]): string {
  const rows = results
    .map(r => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #EAEAEA;font-size:14px;color:#0A0B0D;">${escapeHtml(r.name)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #EAEAEA;text-align:right;">${statusBadge(r.status)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #EAEAEA;text-align:right;font-size:13px;color:#6A6E76;font-variant-numeric:tabular-nums;">${r.durationMs}ms</td>
      </tr>
      ${r.error ? `<tr><td colspan="3" style="padding:0 0 10px 0;border-bottom:1px solid #EAEAEA;font-size:12px;color:#B5443A;font-family:ui-monospace,SFMono-Regular,monospace;">${escapeHtml(r.error)}</td></tr>` : ""}
    `)
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr>
          <th align="left" style="padding-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6A6E76;font-weight:600;">Routine</th>
          <th align="right" style="padding-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6A6E76;font-weight:600;">Status</th>
          <th align="right" style="padding-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6A6E76;font-weight:600;">Duration</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderChangesSection(changes: ProposedChange[], baseUrl: string, token: string): string {
  if (changes.length === 0) {
    return `
      <p style="margin:0 0 16px 0;color:#6A6E76;font-size:14px;">
        No proposed changes this run. Everything ran inside expected ranges.
      </p>
    `;
  }
  const items = changes
    .map(c => {
      const confirmUrl = `${baseUrl}/api/routines/digest/${token}/confirm/${c.id}`;
      const rejectUrl = `${baseUrl}/api/routines/digest/${token}/reject/${c.id}`;
      return `
        <div style="border:1px solid #EAEAEA;border-radius:8px;padding:16px;margin-bottom:12px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6A6E76;margin-bottom:4px;">${escapeHtml(c.routineName)} · ${escapeHtml(c.kind)}</div>
          <div style="font-size:15px;color:#0A0B0D;font-weight:600;margin-bottom:6px;">${escapeHtml(c.title)}</div>
          <div style="font-size:14px;color:#3A3D44;line-height:1.5;margin-bottom:14px;">${escapeHtml(c.detail)}</div>
          <div>
            <a href="${confirmUrl}" style="display:inline-block;padding:8px 14px;background:#CC785C;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;margin-right:8px;">Approve</a>
            <a href="${rejectUrl}" style="display:inline-block;padding:8px 14px;background:#FFFFFF;color:#0A0B0D;text-decoration:none;border:1px solid #D5D6D9;border-radius:6px;font-size:13px;font-weight:600;">Reject</a>
          </div>
        </div>
      `;
    })
    .join("");
  return items;
}

function renderHtml(opts: {
  recipientName: string;
  results: RoutineResult[];
  changes: ProposedChange[];
  token: string;
  baseUrl: string;
}): string {
  const okCount = opts.results.filter(r => r.status === "ok").length;
  const errCount = opts.results.filter(r => r.status === "error").length;
  const promptUrl = `${opts.baseUrl}/api/routines/digest/${opts.token}/prompt`;
  const generatedAt = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Routine digest</title></head>
<body style="margin:0;padding:0;background:#F2F2F2;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6A6E76;margin-bottom:8px;">Prescient Labs · Weekly Digest</div>
          <h1 style="margin:0 0 4px 0;font-size:26px;line-height:1.2;font-weight:700;color:#0A0B0D;letter-spacing:-0.01em;">Hi ${escapeHtml(opts.recipientName)} — here's this week's routine digest.</h1>
          <p style="margin:6px 0 0 0;font-size:13px;color:#6A6E76;">${escapeHtml(generatedAt)}</p>
        </td></tr>

        <tr><td style="padding:24px 32px 8px 32px;">
          <div style="display:inline-block;padding:6px 12px;background:#F2F2F2;border-radius:6px;font-size:13px;color:#0A0B0D;font-weight:600;margin-right:6px;">${okCount}/${opts.results.length} ran cleanly</div>
          ${errCount > 0 ? `<div style="display:inline-block;padding:6px 12px;background:#FCEEEA;border-radius:6px;font-size:13px;color:#B5443A;font-weight:600;">${errCount} failed</div>` : ""}
          ${opts.changes.length > 0 ? `<div style="display:inline-block;padding:6px 12px;background:#FFF4E5;border-radius:6px;font-size:13px;color:#A04A2C;font-weight:600;margin-left:6px;">${opts.changes.length} need${opts.changes.length === 1 ? "s" : ""} your call</div>` : ""}
        </td></tr>

        <tr><td style="padding:16px 32px 24px 32px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#0A0B0D;text-transform:uppercase;letter-spacing:0.06em;">Routine results</h2>
          ${renderResultsTable(opts.results)}
        </td></tr>

        <tr><td style="padding:16px 32px 24px 32px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#0A0B0D;text-transform:uppercase;letter-spacing:0.06em;">Proposed changes${opts.changes.length > 0 ? " — needs your decision" : ""}</h2>
          ${renderChangesSection(opts.changes, opts.baseUrl, opts.token)}
        </td></tr>

        <tr><td style="padding:0 32px 24px 32px;">
          <div style="background:#F8F8F8;border-radius:8px;padding:16px;">
            <div style="font-size:14px;font-weight:600;color:#0A0B0D;margin-bottom:6px;">Want me to change something?</div>
            <div style="font-size:13px;color:#6A6E76;line-height:1.5;margin-bottom:12px;">Reply by writing what you'd like changed — different routines, different schedule, different alerts. The team will review and update on the next run.</div>
            <a href="${promptUrl}" style="display:inline-block;padding:8px 14px;background:#0A0B0D;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Reply with changes</a>
          </div>
        </td></tr>

        <tr><td style="padding:8px 32px 32px 32px;border-top:1px solid #EAEAEA;">
          <p style="margin:16px 0 0 0;font-size:12px;color:#6A6E76;line-height:1.5;">
            You're receiving this because you're an administrator on Prescient Labs.
            Confirm/reject links are single-use and tied to this digest only.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(opts: {
  recipientName: string;
  results: RoutineResult[];
  changes: ProposedChange[];
  token: string;
  baseUrl: string;
}): string {
  const lines: string[] = [];
  lines.push(`Hi ${opts.recipientName} — weekly routine digest.\n`);
  lines.push("Routine results:");
  for (const r of opts.results) {
    lines.push(`  - ${r.name}: ${r.status} (${r.durationMs}ms)${r.error ? ` — ${r.error}` : ""}`);
  }
  lines.push("");
  if (opts.changes.length === 0) {
    lines.push("No proposed changes this run.");
  } else {
    lines.push("Proposed changes (open links to act):");
    for (const c of opts.changes) {
      lines.push(`  - [${c.routineName}] ${c.title}`);
      lines.push(`    ${c.detail}`);
      lines.push(`    Approve: ${opts.baseUrl}/api/routines/digest/${opts.token}/confirm/${c.id}`);
      lines.push(`    Reject:  ${opts.baseUrl}/api/routines/digest/${opts.token}/reject/${c.id}`);
    }
  }
  lines.push("");
  lines.push(`Reply with changes: ${opts.baseUrl}/api/routines/digest/${opts.token}/prompt`);
  return lines.join("\n");
}

export async function sendDigestEmail(opts: {
  digestId: string;
  recipientEmail: string;
  recipientName: string;
  confirmToken: string;
  results: RoutineResult[];
  changes: ProposedChange[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl = publicBaseUrl();
  const subject =
    opts.changes.length > 0
      ? `Routine digest — ${opts.changes.length} change${opts.changes.length === 1 ? "" : "s"} need your call`
      : `Routine digest — all ${opts.results.length} routines ran`;

  const html = renderHtml({
    recipientName: opts.recipientName,
    results: opts.results,
    changes: opts.changes,
    token: opts.confirmToken,
    baseUrl,
  });
  const text = renderText({
    recipientName: opts.recipientName,
    results: opts.results,
    changes: opts.changes,
    token: opts.confirmToken,
    baseUrl,
  });

  return sendEmail({
    to: [{ name: opts.recipientName, email: opts.recipientEmail }],
    subject,
    html,
    text,
    from: { name: "Prescient Labs", email: "info@prescient-labs.com" },
  });
}
