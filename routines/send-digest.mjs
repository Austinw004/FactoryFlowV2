import { readFileSync, appendFileSync } from 'node:fs';

const HTML_PATH = 'routines/digest-2026-05-19.html';
const TEXT_PATH = 'routines/digest-2026-05-19.txt';
const FAIL_LOG = '/tmp/digest-failures.jsonl';

const html = readFileSync(HTML_PATH, 'utf8');
const text = readFileSync(TEXT_PATH, 'utf8');

const subject = 'Daily digest — 5 need your call';

function logFailure(reason) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    digest_date: '2026-05-19',
    subject,
    reason,
  }) + '\n';
  try { appendFileSync(FAIL_LOG, line); } catch {}
  console.error('[digest] send FAILED →', reason);
  console.error('[digest] artifacts retained:', HTML_PATH, '+', TEXT_PATH);
}

try {
  const { sendEmail } = await import('../server/lib/emailService.ts');
  const res = await sendEmail({
    from: { name: 'Prescient Labs', email: 'info@prescient-labs.com' },
    to: [{ email: 'austinwendler44@gmail.com', name: 'Austin' }],
    subject,
    html,
    text,
  });
  if (res?.success) {
    console.log('[digest] sent OK — id=', res.id ?? '(none)');
  } else {
    logFailure(res?.error ?? 'sendEmail returned success:false with no error');
  }
} catch (err) {
  logFailure(String(err?.message ?? err));
}
