# Usage-Based Metering Design

**Status:** Implemented  
**Date:** 2026-04-13

## Executive Summary

FactoryFlowV2's Usage-Based plan ($199/mo base) charges per **active SKU forecasted per month** to ensure customers pay only for value received. This unit was selected as the fairest metering approach across all candidates.

## Rationale: Why Per-SKU is Fairest

### Candidate Evaluation

| Unit | Fairness | Auditability | Notes |
|------|----------|--------------|-------|
| **Per active SKU** | ⭐⭐⭐⭐⭐ | Perfect | SELECTED: Customers only pay for what they manage |
| Per decision approved | ⭐⭐⭐ | Hard | Outcome-based but psychologically resistant to per-action pricing |
| Per API call | ⭐ | Easy but meaningless | Arbitrary; penalizes automation; no correlation to value |
| Per integration sync/day | ⭐⭐ | Moderate | Confusing; discourages integration health; unclear value proposition |
| Per document processed | ⭐⭐ | Moderate | Workflow-specific; ignores core forecasting engine |

### Why Per-SKU Wins

1. **No Idle Capacity Penalty**
   - Customer pays ONLY when actively managing SKUs
   - Unused features don't incur cost
   - Contrast: per-API-call penalizes integrations that sync successfully

2. **Direct Value Alignment**
   - More SKUs = more complex demand forecasting = more operational value
   - Directly tied to the platform's core differentiator
   - Transparent: "Manage 150 SKUs → forecast them → 50 overage × $2 = $100/mo overhead"

3. **Audit-Proof**
   - `SELECT COUNT(DISTINCT sku_id) FROM skus WHERE company_id = ? AND created_at < period_end`
   - No ambiguity, no historical disputes
   - Customer can count SKUs themselves

4. **Growth Signal**
   - SKU expansion = business growth = platform is delivering value
   - Natural upsell trigger: "You've grown to 300 SKUs; Growth plan at $799/mo gives unlimited headroom"

5. **Psychological Acceptance**
   - Customers understand "feature/complexity-based" pricing
   - Better than "per-action" (Stripe per-request, etc.) which feels nickel-and-dime

### What We DON'T Charge For

- **AI Advisor recommendations** (initially): Track but don't charge per-decision
- **Integration sync frequency**: Reward integration health, not penalize activity
- **Data-at-rest** or storage: Included with plan
- **Report generation** or API calls: Included with plan

## Pricing Tiers

### Usage-Based Plan

```
Base Fee:            $199.00/month
Included SKUs:       100 per month
Overage Rate:        $2.00 per additional SKU
Monthly Cap:         $799.00
  (At $799, Growth plan becomes cheaper; customer naturally upsizes)
```

### Pricing Examples

| # SKUs | Calculation | Monthly Cost | Notes |
|--------|-------------|--------------|-------|
| 50 | Base only | $199.00 | Under-utilizing; consider cheaper Starter plan |
| 100 | Base only | $199.00 | Sweet spot for base |
| 150 | $199 + (50 × $2) | $299.00 | Entry to mid-market |
| 200 | $199 + (100 × $2) | $399.00 | Common manufacturing range |
| 300 | $199 + (200 × $2) | $599.00 | Upper mid-market |
| 400 | $199 + (300 × $2) | $799.00 | **At cap; upgrade to Growth** |

### Growth Plan (for comparison)

- **$799/month flat**: Unlimited SKUs, unlimited API calls, premium support
- Usage-Based customers hitting $799 naturally upgrade because they've outgrown metering complexity

## Implementation Details

### Stripe Metering Configuration

- **Meter Name:** `active_skus_per_month`
- **Meter ID:** (Created via Stripe API; see report)
- **Metering Type:** `incremental` (additive; customer submits count, we sum over billing period)
- **Event Aggregation:** Stripe sums all `record_usage()` calls within a month, bills the total

### Database Schema

**New table: `sku_count_snapshots`** (Drizzle migration)
```sql
CREATE TABLE sku_count_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  count_date DATE NOT NULL,
  active_sku_count INTEGER NOT NULL,
  stripe_meter_event_id VARCHAR,
  recorded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, count_date)
);
```

**Existing table: `usage_events`** (already exists; reused)
- Extended purpose: records all metered events including SKU counts
- `metricType = 'active_skus'` for SKU counts
- `quantity = count of active SKUs for the period`

### Daily Metering Job

**Location:** `server/lib/usageMetering.ts` → `dailySkuCountJob()`

Runs daily (midnight UTC):
1. For each company with active Usage-Based subscription:
   - Count distinct SKUs created before today: `SELECT COUNT(DISTINCT id) FROM skus WHERE company_id = ? AND created_at < NOW()`
   - Record in `sku_count_snapshots`
   - Submit to Stripe via `stripe.billing.meterEvents.create()`
     - Key: `company_id-2026-04-13` (for idempotency)
     - Value: count
2. Handle Stripe errors with exponential backoff (max 3 retries)
3. Log all submissions for audit trail

### Idempotency

Stripe meter events use idempotency keys: `{company_id}-{date}`. If submission fails and retries:
- Same event ID + timestamp ensures Stripe doesn't double-count
- Database tracks `stripe_meter_event_id` to correlate

## Integration Points

### When SKU is Created
- No immediate Stripe call (daily job handles batching)
- DB records `usage_events` row with `metricType = 'active_skus'` (optional, for audit trail)

### When Usage-Based Subscription Starts
- Backfill: Run one-time job to count existing SKUs, submit to Stripe with key `{company_id}-{month_start}`
- Or: Start fresh from tomorrow; Stripe invoice first period with 0 metered SKUs, then daily submissions begin

### Billing Period
- Stripe automatically aggregates all meter events submitted during the month
- Next invoice includes: Base $199 + (Overage SKU Count × $2)
- Capped at $799 via Stripe's max usage limit configuration

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Customer "bundles" SKUs to avoid count | Low | Doesn't reduce forecast load; complexity remains high |
| Meter event submission fails; customer not billed | High | Retry with exponential backoff + alerting on repeated failures |
| Stripe meter quota exceeded | Low | Each meter event is small; Stripe's quota is generous (millions/month) |
| Daily job crashes; SKUs not submitted for a month | High | Implement distributed lock + daily health check + Slack alert |
| Customer queries "Why am I billed for 150 SKUs?" | Medium | Provide audit query in dashboard; show daily snapshot counts |

## Performance Plan (Future)

For the Performance-based plan ($100/mo + 15% of verified savings):
- **Separate meter:** `verified_savings_per_month` (tracked in cents)
- **Separate table:** `savings_verification_events`
- **Trigger:** When Advisor recommendation is measured as realized (proof of value)
- **Implementation:** Post-MVP (documented in `performanceBillingService.ts`)

## Testing Strategy

1. **Unit test:** `recordDailySkuCount(companyId, count)` → verify DB insert + Stripe call
2. **Integration test:** Mock Stripe API; simulate daily job; verify idempotency
3. **E2E test:** Create company + 150 SKUs, run daily job, check invoice reflects $199 + $100 overage = $299
4. **Stress test:** Simulate 1000 companies; verify no rate-limit violations or timeouts

## Monitoring & Alerting

- **Metric:** Daily submission success rate (target: 99.9%)
- **Alert:** If submission fails 3+ times for a company in one month
- **Dashboard:** Show company SKU count history + next invoice estimate
- **Audit log:** All meter events timestamped with Stripe event ID + response

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-13  
**Owner:** Billing Engineering
