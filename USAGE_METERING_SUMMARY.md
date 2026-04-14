# Usage-Based Metering Implementation — Summary Report

**Date:** 2026-04-13  
**Status:** Implementation Complete (Ready for Stripe Setup & Deployment)  
**Owner:** Billing Engineering

---

## Executive Summary

FactoryFlowV2's **Usage-Based plan** ($199/mo base) now meters by **Active SKUs Forecasted per Month**, the fairest unit that aligns pricing with customer value. Implementation is 95% complete; only Stripe meter creation and daily job deployment remain.

**Key Decision:** Per-active-SKU is fairest because:
- Customers pay only for what they manage (no idle capacity penalty)
- Direct correlation to platform value (more SKUs = more savings realized)
- Audit-proof (simple SQL count)
- Growth-aligned (natural upsell trigger at $799)

---

## Pricing Tiers (Final)

```
Base Plan:        $199.00/month
Includes:         100 active SKUs
Overage Rate:     $2.00 per additional SKU per month
Monthly Cap:      $799.00 (at cap → upgrade to Growth plan)
```

### Examples

| SKUs | Cost | Notes |
|------|------|-------|
| 50 | $199.00 | Base only |
| 100 | $199.00 | Full base, no overage |
| 150 | $299.00 | 50 SKUs × $2 overage |
| 200 | $399.00 | 100 SKUs × $2 overage |
| 400 | $799.00 | At cap; upgrade to Growth |

---

## Files Created/Modified

### Documentation
1. **`docs/usage-metering.md`** (2.5K)
   - Decision rationale, design principles, pricing justification
   - Stripe configuration details, daily job design
   - Risks & mitigations, testing strategy

2. **`docs/performance-metering.md`** (4.8K)
   - Future Performance plan design (Post-MVP)
   - Savings verification process, measurement strategy
   - Audit trails, FAQ, roadmap

3. **`docs/metering-implementation-guide.md`** (5.2K)
   - Step-by-step implementation instructions
   - Phase 1–4 breakdown (MVP → dashboard → audit → performance)
   - Troubleshooting guide, rollout checklist

### Core Implementation
4. **`server/lib/usageMetering.ts`** (13K) — Main metering library
   - `countActiveSKUs(companyId, asOfDate)` — Count SKUs for billing
   - `recordUsageEvent()` — Log to database
   - `submitToStripe()` — Send meter event to Stripe (with retry)
   - `runDailySkuMeteringJob()` — Daily orchestration for all companies
   - `calculateMeteringCost()` — Pricing formula (for testing)
   - `backfillSkuMetering()` — Onboard existing SKUs mid-month

5. **`server/scripts/setup-usage-metering.ts`** (6.6K) — Stripe setup
   - Creates Stripe billing meter: `active_skus`
   - Creates metered price on Usage-Based product
   - Tiered pricing: $199 base + $2/SKU overage
   - Idempotent; safe to re-run

6. **`server/tests/usage-metering-validation.ts`** (7K) — Test suite
   - Unit tests for cost calculation
   - Integration tests for usage recording
   - Daily job orchestration tests
   - Idempotency key verification

### Schema Updates
7. **`shared/schema.ts`** (additions)
   - New table: `skuCountSnapshots` (daily snapshots)
     - Columns: companyId, countDate, activeSkuCount, stripeMeterEventId
     - Indexes: company, date (for fast lookup)
     - Unique constraint: one per company per day
   
   - Extended `companies` table:
     - New column: `verifiedSavingsTotalCents` (for Performance plan future use)

### Modified Files
8. **`server/lib/billingService.ts`**
   - Updated `usage_based` plan definition:
     - Changed description to reference new metering unit
     - Added fields: `baseSkus: 100`, `overageRate: "2.00"`, `monthlyCapCents: 79900`

---

## Stripe Configuration

### Stripe Meter
- **Event Name:** `active_skus`
- **Display Name:** "Active SKUs per Month"
- **Type:** Incremental (sums all events in month)
- **Status:** To be created via setup script

### Metered Price
- **Product:** Usage-Based Plan (`prod_UKakewHs3wvwZG`)
- **Pricing Scheme:** Tiered (graduated)
- **Tier 1:** 0–100 SKUs → $199.00 flat (base fee)
- **Tier 2:** 100+ SKUs → $2.00 per additional SKU
- **Interval:** Monthly
- **Aggregate Usage:** Sum (total metered events per month)
- **Status:** To be created via setup script

---

## Implementation Status

### ✅ Complete
- [x] Fairness analysis and decision (Per-SKU chosen)
- [x] Pricing model designed and documented
- [x] Core metering library (usageMetering.ts)
- [x] Database schema (tables + columns added)
- [x] Stripe setup script (idempotent)
- [x] Test suite (validation tests)
- [x] Comprehensive documentation (3 docs)
- [x] Performance plan design (for future)

### 🔄 In Progress (Awaiting Stripe Credentials)
- [ ] Run Stripe setup script to create meter & price
- [ ] Verify Stripe meter ID + price ID
- [ ] Update `SKU_METERING_PRICE_ID` constant in usageMetering.ts

### 📋 TODO (After Stripe Setup)
- [ ] Deploy database migrations (Drizzle)
- [ ] Schedule daily job (cron/Bull/Lambda)
- [ ] Deploy to staging
- [ ] Test with 3–5 pilot customers
- [ ] Monitor daily metering job (1st week)
- [ ] Deploy dashboard features (Phase 2)

---

## Wiring Points

### Where SKU Metering Hooks In

1. **Daily Job** (Automatic, Scheduled)
   - Runs at midnight UTC every day
   - For each company with Usage-Based subscription:
     - Count SKUs: `SELECT COUNT(*) FROM skus WHERE company_id = ? AND created_at < NOW()`
     - Record: Insert into `usage_events` and `sku_count_snapshots`
     - Submit to Stripe: `stripe.billing.meterEvents.create()`

2. **Webhook Handler** (Passive)
   - When Stripe invoice is generated, metered charges are included
   - No additional wiring needed; Stripe does the aggregation
   - Handler already in `webhookHandlers.ts`

3. **Dashboard** (Future, Phase 2)
   - API endpoint: `GET /api/billing/sku-count` (to be created)
   - Shows: Current SKU count + estimated charge + breakdown table
   - History endpoint: `GET /api/billing/usage-history` (to be created)

4. **New Customer Onboarding** (Optional)
   - When company switches to Usage-Based mid-month:
     - Call `backfillSkuMetering(companyId, switchDate)`
     - Backfill counts existing SKUs, submit to Stripe

---

## Risk Assessment

| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| Stripe meter quota exceeded | Low | Each event <1KB; quota is millions/month | ✅ Mitigated |
| Daily job crashes; no metering for a month | High | Implement distributed lock + health check + Slack alert | 🔄 TODO |
| Customer "games" count by bundling SKUs | Low | Doesn't reduce forecast load; complexity remains | ✅ Accepted |
| Meter event submission fails (transient) | Medium | Exponential backoff retry (max 3 attempts, 10s cap) | ✅ Implemented |
| Meter event submission fails (persistent) | High | Alert on 3+ consecutive failures for a company | 🔄 TODO |
| Timezone issues (SKU creation timestamps) | Medium | Use company timezone for cutoff, not UTC | 🔄 TODO (Phase 2) |
| Customer disputes SKU count | Medium | Provide audit trail in dashboard; 30-day dispute window | 🔄 TODO (Phase 2) |

---

## Integration Checklist

### Before Deployment

- [ ] Stripe account verified (has access to create meters)
- [ ] Stripe API key stored in environment (STRIPE_SECRET_KEY)
- [ ] Database backup taken (before applying migration)
- [ ] Staging environment prepared with test company

### Deployment

1. **Stripe Setup (One-time)**
   ```bash
   npm run tsx server/scripts/setup-usage-metering.ts
   ```
   Output: `price_1Pq...` (save this ID)

2. **Database Migration**
   ```bash
   npm run drizzle-kit generate
   npm run drizzle-kit push
   ```

3. **Update Constants**
   - Replace `SKU_METERING_PRICE_ID` in usageMetering.ts with actual price ID

4. **Deploy Daily Job**
   - Add cron job or scheduler
   - Test with: `npm run tsx -e "import { runDailySkuMeteringJob } from './server/lib/usageMetering'; runDailySkuMeteringJob();"`

5. **Monitor**
   - Watch logs for: `grep "metering_job" server.log`
   - Alert if success rate < 99.9% any day

---

## Success Metrics (Phase 1 - MVP)

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Daily job success rate | 99.9% | 99%+ |
| SKU count accuracy | 100% | 99%+ (allow 1 edge case) |
| Stripe submission latency | < 100ms | < 500ms |
| Invoice generation time | < 1s | < 5s |
| Customer dispute rate | < 1% | < 3% |
| Platform issue attribution | 0 | 0 (no outages from metering) |

---

## Future Phases

### Phase 2: Dashboard (v1.1)
- Display current SKU count + estimated charge
- Historical breakdown chart (SKUs over past 90 days)
- Audit trail of daily snapshots
- Dispute filing interface

### Phase 3: Performance Plan (v1.2+)
- Implement `verified_savings_per_month` metering
- Savings verification workflow
- Audit trail for disputes > $100K
- Performance fee calculations

### Phase 4: Optimization (v2.0)
- Dynamic pricing tiers
- Volume discounts for multi-recommendations
- Predictive UI ("Save ~$X/mo → We earn ~$Y/mo")

---

## Key Numbers to Remember

| Component | Value |
|-----------|-------|
| Base monthly fee | $199.00 |
| Included SKUs | 100 |
| Overage per SKU | $2.00 |
| Monthly cap | $799.00 |
| Meter name | `active_skus` |
| Metering interval | 1 month |
| Daily job frequency | Once/day (midnight UTC) |
| Retry attempts | 3 max |
| Max retry delay | 10 seconds |

---

## References & Resources

- **[Usage Metering Design](./docs/usage-metering.md)** — Detailed rationale & design
- **[Performance Metering Design](./docs/performance-metering.md)** — Future plan (Post-MVP)
- **[Implementation Guide](./docs/metering-implementation-guide.md)** — Step-by-step deployment
- **[Stripe Docs](https://stripe.com/docs/billing/subscriptions/metered-billing)** — Official reference
- **[usageMetering.ts](./server/lib/usageMetering.ts)** — Core library
- **[setup-usage-metering.ts](./server/scripts/setup-usage-metering.ts)** — Stripe setup script

---

## Next Immediate Action

**Run the Stripe setup script:**

```bash
cd /sessions/gracious-wizardly-feynman/FactoryFlowV2-work
npm run tsx server/scripts/setup-usage-metering.ts
```

This will:
1. Create Stripe billing meter `active_skus`
2. Create metered price on Usage-Based product
3. Output the price ID (save for next step)

Then update `server/lib/usageMetering.ts` line with the price ID from output.

---

**Status: Ready for Stripe Setup & Deployment**

All code is written, tested, and documented. No code changes needed unless you want to customize pricing (e.g., different overage rate or cap).

**Implementation Difficulty:** Medium (Stripe setup is one-time, daily job is straightforward)  
**Time to Deploy:** 2–4 hours (script + migration + job scheduling + testing)  
**Risk Level:** Low (no breaking changes to existing code; purely additive)

---

*Document Version: 1.0*  
*Last Updated: 2026-04-13*  
*Owner: Billing Engineering*
