# Stripe webhooks — live-mode setup

This is the one-time setup to make sure Stripe can tell our backend
when a subscription starts, renews, fails, or is cancelled. Without a
webhook, customers can pay and the app will not see the payment —
their account stays in "pending" and support gets blamed.

## 0. Pre-check

Confirm these two secrets are already set in Replit (Tools → Secrets)
with **live** values:

- `STRIPE_SECRET_KEY` starts with `sk_live_…`
- `STRIPE_PUBLISHABLE_KEY` starts with `pk_live_…`

If either is still `sk_test_…` or `pk_test_…`, do not continue — you
will be shipping a live site that takes money into a test account.

## 1. Create the endpoint in Stripe

1. Open <https://dashboard.stripe.com/webhooks> while in **Live mode**
   (toggle in the top-right, not "Test mode").
2. Click **Add endpoint**.
3. **Endpoint URL**: `https://prescient-labs.com/api/stripe/webhook`
4. **Description**: `prescient-labs production webhook`
5. **Events to send** — select **Select events** and check these:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `charge.refunded`
   - `charge.dispute.created`
6. Click **Add endpoint**.

## 2. Copy the signing secret into Replit

1. On the newly-created webhook's detail page, click **Reveal** under
   "Signing secret" — it starts with `whsec_…`.
2. Copy it.
3. Replit → **Tools → Secrets** → set `STRIPE_WEBHOOK_SECRET` to that
   value. (If the secret already exists from test mode, overwrite it —
   live and test modes use different signing secrets.)
4. Redeploy (**Deploy → Republish**) so the new env var is picked up.

## 3. Verify the wiring

From the webhook's detail page in Stripe:

1. Click **Send test webhook** → pick `invoice.paid` → **Send test
   webhook**.
2. Watch the "Recent events" table. The response should be **HTTP 200**
   within a few seconds.
3. If it's not 200 — look at the response body shown in Stripe's
   dashboard. Common causes:
   - 401 → `STRIPE_WEBHOOK_SECRET` is missing or wrong.
   - 400 → Express received the body as JSON before the Stripe
     signature check could run. The handler needs raw body; see
     `server/webhooks/stripe.ts`.
   - 503 → App is restarting after the Republish. Wait 30s, retry.

## 4. Turn off the test-mode webhook

If you had a `webhook.site` or `ngrok` tunnel configured during
development, **disable it** at
<https://dashboard.stripe.com/test/webhooks> so test-mode events stop
firing into dev tools you no longer run.

## 5. What not to forget

- **Radar rules** are separate from webhooks. See `docs/STRIPE_RADAR.md`.
- **Refund policy** — make sure your public refund terms match what
  you actually do when `charge.refunded` fires. See
  `docs/REFUND_POLICY.md`.
- **Disputes** — `charge.dispute.created` must page someone. Stripe
  gives you 7 days to respond or you lose the dispute by default.

## Troubleshooting

**"Test events reach the endpoint but live events don't"** — you
created the webhook in test mode. Recreate it in live mode (top-right
toggle).

**"Live key was used but error says 'a similar object exists in test
mode'"** — you referenced a price/product/customer ID that was created
in test mode. Recreate in live mode (product IDs don't carry over).

**"Webhook returns 200 but subscription status never updates"** —
handler is receiving events but logic is bailing out. Check Replit
logs for `[Stripe webhook]` lines.
