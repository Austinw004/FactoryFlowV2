#!/usr/bin/env bash
# smoke-test.sh — post-deploy sanity check for prescient-labs.com.
#
# Exits non-zero on any failure. Safe to run locally, in CI, or from
# Replit's Shell. No credentials required.
#
# Usage:
#   ./scripts/smoke-test.sh                      # hits production
#   BASE=https://staging.example ./scripts/...   # hits staging
#
# Exit codes:
#   0 = everything passed
#   1 = one or more checks failed

set -u
BASE="${BASE:-https://prescient-labs.com}"
FAIL=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=1; }
hdr()  { printf '\n\033[1m%s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
hdr "Health probes"

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/readyz")
if [ "$code" = "200" ]; then
  pass "/readyz returned 200 (database reachable)"
else
  fail "/readyz returned $code (expected 200)"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/livez")
if [ "$code" = "200" ]; then
  pass "/livez returned 200"
else
  fail "/livez returned $code (expected 200)"
fi

# ---------------------------------------------------------------------------
hdr "Public pages render (HTTP 200)"

for path in "" "/contact" "/pricing" "/trust" "/signin" "/signup" \
            "/terms" "/privacy" "/how-it-works" "/roi-calculator" \
            "/security" "/status" "/integration-checklist" "/pilot-program"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE$path")
  if [ "$code" = "200" ]; then
    pass "GET $path → 200"
  else
    fail "GET $path → $code (expected 200)"
  fi
done

# ---------------------------------------------------------------------------
hdr "Public API endpoints reachable (NOT 401)"

# The contact form on the landing page hits this. A 401 here means the
# global auth gate has swallowed it and NO visitor can submit a lead.
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -d '{"name":"smoke","email":"smoke@prescient-labs.com","message":"smoke test — please ignore"}' \
  "$BASE/api/contact-sales")
case "$code" in
  200|400)
    # 200 = happy path; 400 = validation rejected the minimal payload, which
    # still proves the endpoint is reachable without auth.
    pass "POST /api/contact-sales → $code (reachable)"
    ;;
  401|403)
    fail "POST /api/contact-sales → $code (auth gate blocking public form — SHIP BLOCKER)"
    ;;
  *)
    fail "POST /api/contact-sales → $code (unexpected)"
    ;;
esac

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/status/summary")
if [ "$code" = "200" ]; then
  pass "GET /api/status/summary → 200"
else
  fail "GET /api/status/summary → $code (expected 200)"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/stripe/config")
if [ "$code" = "200" ]; then
  pub=$(curl -sS "$BASE/api/stripe/config" | grep -oE 'pk_(test|live)_[A-Za-z0-9]+' | head -1)
  mode=$(echo "$pub" | grep -oE 'pk_(test|live)' | sed 's/pk_//')
  if [ "$mode" = "live" ]; then
    pass "GET /api/stripe/config → live publishable key present"
  elif [ "$mode" = "test" ]; then
    fail "GET /api/stripe/config returned a TEST key (should be live before shipping)"
  else
    fail "GET /api/stripe/config → 200 but no Stripe pk_* detected"
  fi
else
  fail "GET /api/stripe/config → $code (expected 200)"
fi

# ---------------------------------------------------------------------------
hdr "Security headers"

headers=$(curl -sSI "$BASE/")
for h in "content-security-policy" "strict-transport-security" "x-content-type-options" "referrer-policy"; do
  if printf '%s' "$headers" | grep -qi "^$h:"; then
    pass "$h present"
  else
    fail "$h missing"
  fi
done

# ---------------------------------------------------------------------------
hdr "Result"

if [ "$FAIL" -eq 0 ]; then
  printf '\033[32mAll smoke tests passed.\033[0m\n'
  exit 0
else
  printf '\033[31mSmoke test failures above. Do not ship.\033[0m\n'
  exit 1
fi
