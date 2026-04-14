# Usage-Based Metering Implementation Guide

**Status:** Ready for Implementation  
**Version:** 1.0  
**Last Updated:** 2026-04-13

## Quick Reference

This document guides the full implementation of usage-based metering for Prescient LabsV2. The implementation is split into:

1. **Immediate (MVP):** Stripe meter + daily SKU counting job
2. **Post-MVP (v1.1):** Dashboard integration + audit features
3. **Future (v2+):** Performance plan metering

---

## Phase 1: MVP Implementation (Stripe + Daily Job)

### Step 1: Create Stripe Meter & Price

**File:** `server/scripts/setup-usage-metering.ts` (already created)

```bash
# Run once to set up Stripe meter and metered price
npm run tsx server/scripts/setup-usage-metering.ts
```

**Output:**
```
📊 Creating billing meter...
✅ Meter created: meter_active_skus_monthly
💰 Creating metered price...
✅ Metered price created: price_1PqLmhPwb9yK6c3pE3c4d5e6
```

**Manual Verification:**
1. Open [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Products → Usage-Based Plan
3. Verify price exists with tiers:
   - Tier 1: Up to 100 SKUs → $199.00 flat
   - Tier 2: Over 100 SKUs → $2.00 per additional SKU

### Step 2: Deploy Database Migrations

```bash
# Generate migration for new tables
npm run drizzle-kit generate

# Run migration
npm run drizzle-kit push
```

**What gets created:**
- `sku_count_snapshots` table (daily SKU count history)
- `companies.verified_savings_total_cents` column (for Performance plan)

### Step 3: Deploy Daily Metering Job

The daily job runs every night at midnight UTC to count SKUs and submit to Stripe.

**Option A: Scheduled Task (Recommended)**

Add to a job scheduler (e.g., Bull Queue, node-cron, or Lambda):

```typescript
import { CronJob } from "cron";
import { runDailySkuMeteringJob } from "./lib/usageMetering";

// Run at midnight UTC every day
const job = new CronJob(
  "0 0 * * *",
  async () => {
    console.log("🔄 Running daily SKU metering job...");
    const results = await runDailySkuMeteringJob();
    console.log(`✅ Processed ${results.length} companies`);
  },
  null,
  true,
  "UTC"
);
```

**Option B: External Cron Service**

```bash
# Using EasyCron, GitHub Actions, or similar
POST https://your-api.com/api/billing/run-metering-job
Authorization: Bearer INTERNAL_API_KEY
```

Endpoint:
```typescript
// server/routes/billing.ts
export async function POST /api/billing/run-metering-job(req, res) {
  // Verify internal API key
  if (req.headers.authorization !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const results = await runDailySkuMeteringJob();
  return res.json({ success: true, processed: results.length });
}
```

### Step 4: Wire into Stripe Webhook Handler

When a customer's invoice is generated, Stripe includes metered usage.

**File:** `server/webhookHandlers.ts`

```typescript
// Add handling for invoice.created webhook
case "invoice.created":
  await handleInvoiceCreated(event.data.object);
  break;
```

No changes needed to existing webhook logic — Stripe automatically:
1. Sums all meter events from the month
2. Applies tiered pricing
3. Includes metered charges on the invoice

### Step 5: Test End-to-End

```bash
# Run metering validation tests
npm run jest server/tests/usage-metering-validation.ts

# Manual test: submit meter event to Stripe staging
npm run tsx server/scripts/test-meter-submission.ts
```

**Expected Output:**
```
✅ SKU count calculation tests pass
✅ Metering cost formula tests pass
✅ Stripe submission mock succeeds
✅ Idempotency key generation works
```

---

## Phase 2: Dashboard Integration (Post-MVP)

### Display Estimated Charges

**File:** `client/routes/billing/usage-dashboard.tsx` (new)

```tsx
export function UsageDashboard() {
  const [skuCount, setSkuCount] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  useEffect(() => {
    // Fetch company SKU count
    fetch("/api/billing/sku-count").then(res => {
      const count = res.json().count;
      setSkuCount(count);
      
      // Calculate estimated cost
      const cost = calculateMeteringCost(count);
      setEstimatedCost(cost);
    });
  }, []);

  return (
    <div className="billing-usage">
      <h2>Your Usage This Month</h2>
      <div className="metric">
        <span className="label">Active SKUs:</span>
        <span className="value">{skuCount}</span>
      </div>
      <div className="metric">
        <span className="label">Estimated Charge:</span>
        <span className="value">{formatMeteringCost(estimatedCost)}</span>
      </div>
      <BreakdownTable skuCount={skuCount} />
    </div>
  );
}

function BreakdownTable({ skuCount }: { skuCount: number }) {
  return (
    <table>
      <tr>
        <td>Base Fee (0–100 SKUs)</td>
        <td>$199.00</td>
      </tr>
      {skuCount > 100 && (
        <tr>
          <td>Overage ({skuCount - 100} SKUs × $2)</td>
          <td>${((skuCount - 100) * 2).toFixed(2)}</td>
        </tr>
      )}
      <tr className="total">
        <td><strong>Estimated Total</strong></td>
        <td><strong>{formatMeteringCost(calculateMeteringCost(skuCount))}</strong></td>
      </tr>
    </table>
  );
}
```

### API Endpoint for SKU Count

**File:** `server/routes/billing.ts`

```typescript
export async function GET /api/billing/sku-count(req, res) {
  const companyId = req.user.companyId;
  const count = await countActiveSKUs(companyId);
  
  return res.json({
    count,
    estimatedCostCents: calculateMeteringCost(count),
    asOfDate: new Date().toISOString(),
  });
}
```

---

## Phase 3: Audit & Transparency (Post-MVP)

### Provide Audit Trail

**File:** `server/routes/billing.ts`

```typescript
export async function GET /api/billing/usage-history(req, res) {
  const companyId = req.user.companyId;
  
  const history = await db
    .select()
    .from(skuCountSnapshots)
    .where(eq(skuCountSnapshots.companyId, companyId))
    .orderBy(desc(skuCountSnapshots.countDate));

  return res.json(history);
}
```

**Response:**
```json
[
  {
    "countDate": "2026-04-13",
    "activeSkuCount": 150,
    "stripeMeterEventId": "sku-count-{id}-2026-04-13",
    "recordedAt": "2026-04-13T00:05:00Z"
  },
  {
    "countDate": "2026-04-12",
    "activeSkuCount": 148,
    "stripeMeterEventId": "sku-count-{id}-2026-04-12",
    "recordedAt": "2026-04-12T00:05:00Z"
  }
]
```

### Dispute Flow

**File:** `server/routes/billing.ts`

```typescript
export async function POST /api/billing/usage-dispute(req, res) {
  const { dateInQuestion, explanation } = req.body;
  
  // Log dispute
  await db.insert(usageDisputes).values({
    companyId: req.user.companyId,
    countDate: dateInQuestion,
    explanation,
    status: "pending",
  });

  // Alert billing team
  await notifyBillingTeam(`SKU count disputed for ${dateInQuestion}`);
  
  return res.json({ 
    message: "Dispute logged. Our team will review within 48 hours.",
  });
}
```

---

## Phase 4: Performance Plan (Post-MVP)

### Add Savings Tracking

**File:** `server/lib/performanceMeteringService.ts` (new)

```typescript
export async function recordSavingsEvent(
  companyId: string,
  advisorRecommendationId: string,
  savingsCents: number,
  evidenceChain: SavingsEvidence,
): Promise<void> {
  // Validate evidence chain is complete
  if (!evidenceChain.beforeSpend || !evidenceChain.afterSpend) {
    throw new Error("Incomplete evidence chain");
  }

  // Record in database
  await db.insert(savingsVerificationEvents).values({
    companyId,
    advisorRecommendationId,
    savingsAmountCents: savingsCents,
    baselineSpendCents: evidenceChain.beforeSpend,
    actualSpendCents: evidenceChain.afterSpend,
    dataSource: evidenceChain.source,
    trustScore: calculateTrustScore(evidenceChain),
  });

  // Submit to Stripe
  await submitToStripe("verified_savings", savingsCents, companyId);

  // Update company YTD total
  await db
    .update(companies)
    .set({
      verifiedSavingsTotalCents: sql`verified_savings_total_cents + ${savingsCents}`,
    })
    .where(eq(companies.id, companyId));
}
```

---

## Rollout Checklist

### Pre-Launch

- [ ] Stripe meter created (`meter_active_skus_monthly`)
- [ ] Metered price created on Usage-Based product
- [ ] Database migrations applied (sku_count_snapshots table)
- [ ] Daily job scheduled and tested (runs at midnight UTC)
- [ ] Webhook handler verified (invoices update correctly)
- [ ] All metering tests pass (unit + integration)

### Launch

- [ ] Deploy to staging environment
- [ ] Test with 3–5 pilot customers
  - [ ] Verify SKU counts accurate
  - [ ] Verify Stripe meter events submitted
  - [ ] Verify invoices generated correctly
- [ ] Monitor logs for errors
  - Alert if: submission failures > 1% of companies/day
  - Alert if: Stripe rate limits hit

### Post-Launch

- [ ] Monitor daily metering job success rate
- [ ] Track customer disputes (expect 0–2% in first month)
- [ ] Gather feedback on pricing fairness
- [ ] Plan Phase 2 dashboard features

---

## Troubleshooting

### Issue: Stripe meter event submission fails

**Debug Steps:**
1. Check logs: `grep "stripe_meter_event" server.log`
2. Verify Stripe API key is valid
3. Verify meter ID in usageMetering.ts matches Stripe dashboard
4. Check if Stripe rate limit hit: `stripe.errors.StripeRateLimitError`

**Fix:**
- Retry with exponential backoff (already implemented)
- Increase `maxDelayMs` in retryWithBackoff options
- Check Stripe incident status: https://status.stripe.com

### Issue: SKU counts seem wrong

**Debug Steps:**
1. Manual query: `SELECT COUNT(*) FROM skus WHERE company_id = '...' AND created_at < NOW()`
2. Compare to dashboard display
3. Check if timezone issue: are SKU creation times in correct zone?

**Fix:**
- Verify company timezone setting
- Re-run daily job for specific date: `runDailySkuMeteringJob(new Date('2026-04-13'))`

### Issue: Dashboard shows "Calculating..." indefinitely

**Debug Steps:**
1. Check `/api/billing/sku-count` endpoint returns in < 500ms
2. Verify database connection is healthy
3. Check browser console for fetch errors

**Fix:**
- Add query timeout: `countActiveSKUs(companyId, { timeout: 2000 })`
- Cache result for 1 hour: `skuCountCache.get(companyId)`

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| SKU count query latency | < 200ms | TBD |
| Daily job duration (1000 companies) | < 5 min | TBD |
| Stripe submission success rate | > 99.9% | TBD |
| Dashboard load time | < 1s | TBD |
| Customer dispute response time | < 48h | N/A |

---

## References

- [Stripe Metered Billing Docs](https://stripe.com/docs/billing/subscriptions/metered-billing)
- [Usage Metering Design](./usage-metering.md)
- [Performance Plan Design](./performance-metering.md)
- [Billing Service](../server/lib/billingService.ts)
- [Usage Metering Library](../server/lib/usageMetering.ts)

---

**Next Steps:**
1. Run setup script: `npm run tsx server/scripts/setup-usage-metering.ts`
2. Apply database migration: `npm run drizzle-kit push`
3. Deploy daily job scheduler
4. Monitor first week of metering submissions
5. Gather customer feedback on fairness
