# GitHub setup — one-time

The workflows in `.github/workflows/` won't fire until the repo is
configured. This is the punch list. ~5 minutes total.

## 1. Create the `production` environment

GitHub → **Settings → Environments → New environment**

- Name: `production`
- Required reviewers: add yourself (Austin). This means every
  `db-push` run pauses until you click Approve.
- Wait timer: 0 minutes (you'll be the bottleneck, not the timer)
- Deployment branches: `main` only

## 2. Add the secret

Inside the new `production` environment → **Add secret**:

- Name: `DATABASE_URL`
- Value: the production Postgres connection string (Neon / Replit DB /
  whatever you use). Format:
  `postgresql://user:password@host/dbname?sslmode=require`

If you also keep a staging DB, repeat the steps above for a `staging`
environment with `STAGING_DATABASE_URL`, then uncomment the
`push-staging` job at the bottom of `.github/workflows/db-push.yml`.

## 3. Enable Actions if it's not already on

GitHub → **Settings → Actions → General**:

- Allow all actions and reusable workflows: enabled
- Workflow permissions: "Read and write permissions" (so the meta-routine
  PRs can be opened from a routine using the GH connector)

## 3.5. Allow auto-merge

GitHub → **Settings → General → Pull Requests**:

- Allow auto-merge: enabled

This lets the `dependabot-auto-merge` workflow squash-merge passing
patch/minor dep bumps without you clicking anything.

## 4. (Recommended) Branch protection on `main`

GitHub → **Settings → Branches → Add rule**:

- Branch name pattern: `main`
- Require a pull request before merging: on
- Require status checks to pass: on
  - Required check: `ci / typecheck + build`
- Require branches to be up to date: on
- Do not allow bypassing the above settings: on

This is what makes the meta-routine safe — every PR it opens, including
ones you wrote yourself, has to pass CI before merge.

## 5. Verify

After you've done steps 1–4:

1. Push any small no-op change to `main` (or merge a PR). The `ci`
   workflow should run on the PR.
2. To smoke-test `db-push` manually: GitHub → Actions → `db-push` →
   "Run workflow" → main. It should pause for your approval, then run
   `npm run db:push`. The first run will create the
   `contact_inquiries` table that's been waiting in `shared/schema.ts`.

## What runs when

| Trigger                                       | Workflow         | What it does                                   |
| --------------------------------------------- | ---------------- | ---------------------------------------------- |
| Push to `main` touching `shared/schema.ts`    | `db-push.yml`    | Pauses for approval, then `drizzle-kit push`   |
| Push to `main` (any file)                     | `ci.yml`         | `npm ci` + `npm run check` + `npm run build`   |
| Pull request → `main`                         | `ci.yml`         | Same as above; result becomes the PR check     |
| Manual: Actions → db-push → Run workflow      | `db-push.yml`    | Same flow with optional `reason` input         |
| Weekly Monday 06:00 CT                        | `dependabot.yml` | Opens grouped npm + Actions update PRs         |
| Dependabot PR opened                          | `dependabot-auto-merge.yml` | Auto-merges patch/minor bumps after CI passes  |

## What's NOT automated (yet)

- Production code deploy to your runtime (Replit / Render / wherever).
  Add that as a separate job once you've picked a target.
- Email send-deliverability checks (SPF / DKIM / DMARC) for the new
  `info@prescient-labs.com` mailbox. Run a test inbound + outbound to
  the address from a Gmail account and confirm both directions work
  end-to-end before wiring it into customer-facing copy.
