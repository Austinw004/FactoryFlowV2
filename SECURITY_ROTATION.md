# Security — urgent key rotation

## What happened

`.replit` currently has these committed in plain text under
`[userenv.shared]`:

- `ENCRYPTION_KEY` — 64-char hex, used by `server/lib/securityHardening.ts`
  for AES-256 encryption. The app exits on startup if it's missing, so
  this is an active production key, not a placeholder.
- `TESTING_VITE_STRIPE_PUBLIC_KEY` — Stripe publishable test key
- `TESTING_STRIPE_SECRET_KEY` — Stripe secret test key (test mode, can
  still create charges on test infra)

Anyone with access to this repo (current collaborators, past
collaborators, GitHub, backup archives) has these values. That makes
them compromised, even if the repo is private.

## Why it matters

`ENCRYPTION_KEY` is the crypto material protecting whatever the app
encrypts at rest. If a future customer's data is ever tied to this key,
a leaked key equals leaked data. Rotating it now, before we have
enterprise customers with their own encrypted rows, is cheap.

The Stripe test keys cannot charge real cards but they let an attacker
run Stripe API calls against your test account — harmless but noisy.

## Fix — do it in this order

### Step 1 — Generate new keys

Open a terminal and run:

```bash
openssl rand -hex 32
```

Save the output as your new `ENCRYPTION_KEY`.

For Stripe, roll the test keys from the Stripe dashboard:
Developers → API keys → "Roll" on both publishable + secret test keys.

### Step 2 — Put the new values in Replit Secrets

Replit workspace → **Tools → Secrets** (NOT the `.replit` file). Add:

- `ENCRYPTION_KEY` = the hex string from openssl
- `CREDENTIAL_ENCRYPTION_KEY` = the same value (or generate a second one)
- `TESTING_VITE_STRIPE_PUBLIC_KEY` = the rolled Stripe pub key
- `TESTING_STRIPE_SECRET_KEY` = the rolled Stripe secret key

Replit Secrets inject these as environment variables at runtime and
DO NOT commit them to the repo.

### Step 3 — Add them to the GitHub `production` environment too

Same values. GitHub → Settings → Environments → `production` → add each
one as an environment secret. This is so the `db-push` workflow and any
future deploy workflow can see them.

### Step 4 — Deploy and verify

Restart the Replit deployment. Watch logs for the startup line:

```
[Security] FATAL: ENCRYPTION_KEY environment variable must be set
```

If that message does NOT appear and the app boots, the new key is
loading from Secrets correctly.

Verify the app's critical flows still work:
- Log in
- Anything that reads previously-encrypted data (integrations,
  credentials). **If decryption fails, it's because existing rows are
  encrypted with the OLD key — you'll need a one-time re-encrypt pass.**
  See "Re-encrypting existing data" below.

### Step 5 — Remove the values from `.replit`

Only after Step 4 confirms the new secrets are flowing, edit `.replit`
and delete the three offending lines under `[userenv.shared]`:

```diff
 [userenv]

 [userenv.shared]
-ENCRYPTION_KEY = "4b37..."
-TESTING_VITE_STRIPE_PUBLIC_KEY = "pk_test_..."
-TESTING_STRIPE_SECRET_KEY = "sk_test_..."

 [userenv.development]
 APP_ENV = "development"
```

Commit + push the scrubbed `.replit`. (The keys will still live in git
history — see Step 6.)

### Step 6 — Decide whether to purge git history

The old key values are still in every past commit. Options:

- **Do nothing.** The keys are rotated, so the leaked values no longer
  unlock anything. History is cosmetic. This is the simplest path.
- **Force-rewrite history.** Use `git filter-repo` or BFG to strip the
  values from every historical commit, then force-push. Breaks every
  clone and existing PR. Only worth doing if the repo will ever become
  public or if a compliance auditor specifically asks.

Recommendation: rotate now, leave history alone, and make sure this
doesn't happen again by following `.replit.example` going forward.

## Re-encrypting existing data

If the app encrypts rows in the DB (check `server/lib/credentialService.ts`
and any column that calls `encrypt()` / `decrypt()`), existing rows are
ciphertext-locked to the OLD key. Two safe patterns:

1. **Temporary dual-key read.** Have the decrypt function try the new
   key, fall back to the old key. As rows get touched, re-encrypt them
   with the new key. When the old key's usage drops to zero, remove it.
2. **One-shot migration script.** Take a brief maintenance window.
   Decrypt every row with the old key, re-encrypt with the new key in
   a transaction, then flip the deployed key over.

For the current volume (pre-GA), option 2 is simpler. Write the script
against a DB snapshot first, verify, then run it against production.

## How to prevent this going forward

- `.replit` should never contain `[userenv.shared]` values for secrets.
  Use Replit Secrets instead. See `.replit.example` for the shape.
- Add any new secret to:
  1. Replit Secrets (runtime)
  2. GitHub `production` environment (for workflows)
  3. `.env.example` (so local devs know it exists, but without the value)
- If you run `git grep 'SECRET\|KEY\|TOKEN' -- .replit` and it returns
  a value after the `=`, the value is a leak in progress.

## Owner

Austin Wendler (austinwendler44@gmail.com).
If this runbook is being followed by someone else, stop and page Austin.
