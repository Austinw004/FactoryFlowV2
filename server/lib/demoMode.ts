/**
 * Shared demo-mode gate. Background jobs in server/backgroundJobs.ts have
 * their own private copy of this check; this module exposes the same gate
 * to user-triggered "generate synthetic data" services so they short-circuit
 * in production unless the operator explicitly opts in via DEMO_MODE=1.
 *
 * Production tenants run with DEMO_MODE unset → gated functions become
 * no-ops. Demo / pilot environments set DEMO_MODE=1 to populate dashboards
 * against synthetic tenants.
 *
 * Keep this check trivial — `process.env.DEMO_MODE === "1"`. Resist the
 * urge to add "fuzzy" matches like "1|true|yes" — operator should set
 * the explicit value the same way backgroundJobs.ts has always read it.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}
