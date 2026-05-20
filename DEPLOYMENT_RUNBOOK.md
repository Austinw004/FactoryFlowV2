# Deployment & Operations Runbook

> Operational playbook for FactoryFlow V2 (prescient-labs.com).
> Captures hard-won knowledge from production incidents — read this
> before your first solo deploy.

Last updated: 2026-05-20 (after the round-40 Sentry/ESM debugging session).

---

## 1. How deploys actually work

The app runs on **Replit Autoscale** (2 vCPU / 4 GiB RAM / 3 max instances).
Production domain: `https://prescient-labs.com` (custom domain) +
`https://factory-flow-austinwendler44.replit.app` (Replit default).

### The deploy pipeline (what "Republish" does)

```
Provision  →  Security Scan  →  Build  →  Bundle  →  Promote
   │
   └── If schema changed: a MIGRATION-APPROVAL GATE appears here.
       ⚠️ This is where the dangerous part lives — see §3.
```

- **Build command** (`package.json`):
  `vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- **Start command**: `NODE_ENV=production node dist/index.js`

### ⚠️ CRITICAL: Replit deploys from the WORKSPACE, not GitHub

This is the single most confusing thing about this setup and it cost us
hours on 2026-05-19.

- "Republish" deploys the current **Replit workspace filesystem** — NOT
  whatever is on GitHub's `main`.
- A `git push` to GitHub does **NOT** automatically reach the deploy.
- To deploy code that's on GitHub but not in the workspace, you must
  **pull it into the workspace first**:

  ```bash
  # In the Replit Shell tab:
  git fetch origin main && git reset --hard origin/main
  git log --oneline -1   # confirm you're on the commit you expect
  ```

  …then click **Republish**.

- Likewise, changes made/committed in the workspace are NOT on GitHub
  until you `git push origin main` from the workspace (which prompts for
  a GitHub-credentials authorization the first time per session).

**Keep workspace and GitHub in sync** to avoid divergence. After any
local-machine push to GitHub, pull it into the workspace before the next
Republish.

---

## 2. The ESM bundle gotcha (why `require()` silently fails)

The server is bundled as an **ES module** (`esbuild ... --format=esm`).
In ESM, the CommonJS `require()` global **does not exist**. Code like:

```js
const Sentry = require("@sentry/node");   // ❌ ReferenceError: require is not defined
```

throws at runtime. If that throw is inside a `try/catch`, it fails
**silently** — the feature just never works, with no visible error.

**Rule: in `server/` code, never use `require()`.** Use:
- Static `import` at the top of the file (preferred), or
- Dynamic `await import(...)` (for lazy / conditional loading).

This bit us with the Sentry integration (round-40): a defensive
`require("@sentry/node")` made `sentryActive` silently `false` in
production for hours, even though the package was installed and the DSN
was set. A local `node -e "require('@sentry/node')"` test PASSED (plain
CommonJS) and sent us down the wrong path — remember the deployed bundle
is ESM, not CommonJS.

---

## 3. Database migrations — current approach + the danger

### How schema changes ship today

There is **no version-controlled migrations directory**. Schema is
managed two ways:

1. **`drizzle-kit push`** (manual, rarely used directly) — diffs
   `shared/schema.ts` against the live DB and applies changes.
2. **`server/lib/schemaSelfHeal.ts`** (runs every boot) — idempotent
   `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements. This is the
   **safe, additive** path used in practice.

### ✅ The SAFE way to add a schema column

1. Add the column to `shared/schema.ts`.
2. Add a matching entry to the `ADDITIONS` array in
   `server/lib/schemaSelfHeal.ts` (snake_case column name + type).
3. Deploy. On boot, the column is added via `ADD COLUMN IF NOT EXISTS` —
   idempotent, non-destructive, no approval gate.

This pattern only ADDS columns. It never drops, renames, or retypes.

### ⚠️ DANGER: the migration-approval gate

When Replit's deploy detects a schema change it can't do additively, the
**Provision** step pauses at a migration-approval gate showing generated
SQL and an **"Approve and publish"** button.

**On 2026-05-19 this gate showed a STALE migration** generated ~23 hours
earlier, before three `email_verification` columns existed in
`schema.ts`. It wanted to:

```sql
ALTER TABLE "users" DROP COLUMN "email_verified";          -- 104 rows
ALTER TABLE "users" DROP COLUMN "email_verification_token"; -- 104 rows
ALTER TABLE "users" DROP COLUMN "email_verification_expires_at";
```

Approving it would have **deleted live data and broken signup**.

**Rules for the migration gate:**
1. **READ the SQL before approving.** Every time. No exceptions.
2. If you see `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN ... TYPE`, or any
   "permanently remove data" warning — **DO NOT approve.** Click Cancel.
3. A stale/wrong migration is usually fixed by: **Cancel** the stuck
   deploy → ensure the workspace is on the latest code (`git reset --hard
   origin/main`) → start a **fresh** Republish. A fresh deploy regenerates
   the migration against the current schema (which matches the live DB,
   so no destructive diff).
4. If a deploy sits "Publishing" for more than ~15 min, it's probably
   stuck at this gate blocking all subsequent Republishes. Cancel it.

### Recommended future work: establish a migrations baseline

To get real rollback capability (not in place today):
1. Run `npx drizzle-kit generate` to snapshot current schema into
   `./migrations` (a baseline migration).
2. Baseline it as already-applied against the live DB so it isn't
   re-run.
3. Future schema changes → `drizzle-kit generate` produces incremental,
   reviewable, reversible migration files committed to git.

Do this on a maintenance window with a Neon branch snapshot taken first
(see §5). It's deferred because doing it half-right is worse than the
current additive-only approach.

---

## 4. Monitoring & alerting

### Health endpoints (all live, no auth)

| Endpoint | Purpose | Use for |
|---|---|---|
| `/livez` | Liveness — is the process up? | Uptime monitor (lightest) |
| `/readyz` | Readiness — can it serve traffic? | Load-balancer / deploy gate |
| `/api/health` | Deep check — DB latency, cache, WS count. Returns 503 if DB down. | Uptime monitor (richest signal) |
| `/api/_test/sentry-probe` | Confirms Sentry SDK is initialized + sends a test event. | Verifying Sentry after a deploy |

### Error monitoring — Sentry (LIVE as of round-40)

- Project: `prescient-labs.sentry.io` (Node + browser, free tier 5k events/mo).
- DSN is in Replit Secrets as `SENTRY_DSN` (server) + `VITE_SENTRY_DSN`
  (client). The client DSN is also hard-coded in `client/src/main.tsx`
  (Sentry client DSNs are not secret — Replit's build can't read Secrets
  at build time, so hard-coding is the reliable path).
- All **5xx** errors auto-report with request-ID (`X-Request-Id` header),
  path, method, userId, companyId. 4xx (client mistakes) are not sent.
- **Verify after any deploy**: `curl https://prescient-labs.com/api/_test/sentry-probe`
  → expect `{"sentryActive":true,"eventId":"...","dsnConfigured":true}`.
  If `sentryActive:false`, Sentry isn't initializing — check §2 (ESM) and
  that the env vars are set.

### ⚠️ STILL NEEDED: uptime/pager alerting

Sentry catches *errors*. It will NOT page you if the whole app goes
**down** (process crash, Replit outage, DNS). Set up an external uptime
monitor:

1. Sign up at **Better Stack** (betterstack.com) or **Cronitor** —
   both have free tiers.
2. Add an HTTP monitor:
   - URL: `https://prescient-labs.com/livez` (or `/api/health` for DB-aware)
   - Interval: 1-3 min
   - Alert if: non-200, or `/api/health` returns 503
3. Add a notification channel (SMS / email / Slack) so you get paged at
   2am when it matters.

(This is the one monitoring gap that requires a SaaS account — same as
Sentry signup; can't be done from the codebase.)

---

## 5. Rollback procedures

### Roll back a bad deploy

Replit keeps a deploy history (Publishing tab → deploy list). Each entry
is a published version.
1. Open the Publishing/deploys list.
2. Find the last-known-good deploy (timestamp before the bad one).
3. Use Replit's "rollback to this deploy" option (or re-publish from the
   matching git commit by pulling it into the workspace first — see §1).

### Roll back the code

```bash
# In workspace shell — find the good commit:
git log --oneline -10
# Reset to it (DESTRUCTIVE to uncommitted work — be sure):
git reset --hard <good-sha>
# Republish.
```

### Roll back the database

- Neon (the Postgres provider) supports **branch/point-in-time restore**.
- **Before any risky migration**, create a Neon branch snapshot from the
  Neon console (or Replit's Database tab → Manage). That snapshot is your
  restore point.
- If a migration corrupts data: restore the Neon branch to the
  pre-migration snapshot. Coordinate with a brief maintenance window.

There is no automated DB rollback — it's a manual Neon-console operation.
**The snapshot-before-risky-change habit is your safety net.**

---

## 6. Secrets management

- All secrets live in **Replit Secrets** (not in code, not in git).
- Integration credentials (HubSpot/Slack/Shopify/etc. tokens) stored in
  the `companies` table are **encrypted at rest** via
  `server/lib/companySecrets.ts` (`v1:` prefix = encrypted; legacy
  plaintext is auto-migrated by the boot-time backfill in
  `server/lib/encryptionBackfill.ts`).
- `ENCRYPTION_KEY` (64 hex chars) decrypts those — rotating it without
  re-encrypting will orphan all encrypted values. See `SECURITY_ROTATION.md`.
- Critical env vars are validated fatal-at-boot (`JWT_SECRET`,
  `ENCRYPTION_KEY`, `DATABASE_URL`) — a missing one fails the boot loudly
  rather than running degraded.

---

## 7. Pre-deploy checklist

Before clicking Republish on a change that touches schema or core flows:

- [ ] Workspace is on the intended commit (`git log --oneline -1`)
- [ ] Workspace synced with GitHub `main` (no surprise divergence)
- [ ] If schema changed: new columns added to BOTH `shared/schema.ts`
      AND `schemaSelfHeal.ts` ADDITIONS (additive path)
- [ ] Neon snapshot taken if the change is risky
- [ ] No `require()` added to `server/` code (ESM — see §2)

After the deploy completes:

- [ ] `curl /api/health` → 200 healthy
- [ ] `curl /api/_test/sentry-probe` → `sentryActive:true`
- [ ] Spot-check the specific flow you changed
- [ ] At the migration gate (if shown): READ the SQL, never approve a DROP

---

## 8. Known fragilities (as of 2026-05-20)

- **Replit IDE in browser automation is unstable** — the Shell terminal
  and IDE panes intermittently fail to render under automated control.
  Manual operation by a human in the browser is reliable.
- **Uptime alerting not yet configured** (see §4).
- **No version-controlled migrations** (see §3).
- **SendPulse SMTP** pending moderation approval — until it clears,
  outbound email (verification, password reset, dunning, team invites)
  is queued/silent. Code is live and will start delivering automatically
  once approved.
