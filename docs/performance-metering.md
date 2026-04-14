# Performance-Based Billing & Metering (Future Implementation)

**Status:** Design Phase (Not Yet Implemented)  
**Target Implementation:** Post-MVP  
**Date Created:** 2026-04-13

## Overview

The Performance plan charges $100/mo base + **15% of verified, realized savings** delivered by FactoryFlowV2's AI Advisor.

This document outlines the metering strategy for the Performance plan. Implementation is deferred until:
1. Core Usage-Based metering is proven stable (v1)
2. Advisor savings measurement becomes auditable (evidence chain complete)
3. Customer demand justifies the complexity

## Why Performance-Based Billing is Fair

Unlike Usage-Based (which charges for complexity managed), Performance-Based aligns the vendor with the customer's outcome:
- **Customer pays only when value is realized** (not estimated)
- **Shared risk**: We only earn if customers save money
- **Psychological win**: "We win when you win"

## Design Principles

1. **Verified = Auditable**
   - No estimated savings, no projections
   - Evidence chain complete: before → change → after → measurement
   - Customer can independently verify numbers

2. **Measured, not Modeled**
   - Pull actual post-change costs from ERP, procurement systems
   - Compare to baseline (pre-change procurement spend)
   - Account for time lag (savings take 30-90 days to materialize)

3. **No Gaming Incentives**
   - Split savings fairly: we get 15%, customer gets 85%
   - Discourage artificial baseline inflation ("make last year look bad")
   - Require third-party audit for claims > $100K

4. **Transparent Aggregation**
   - Display running total in dashboard: $X saved YTD → $Y owed to FactoryFlowV2
   - Monthly invoice shows: $100 base + $Savings × 15%
   - Customer can dispute any savings record (triggers audit review)

## Metering Strategy

### Billing Unit: Verified Savings (in cents)

**Meter:** `verified_savings_per_month`

**Event Trigger:** When an Advisor recommendation is measured as delivered

```typescript
interface SavingsEvent {
  company_id: string;
  advisor_recommendation_id: string;
  savings_cents: number;        // Actual measured savings in cents
  evidence_chain: {
    before_spend: number;         // Baseline monthly spend (in cents)
    after_spend: number;          // Actual spend post-change (in cents)
    measurement_period: string;   // "30-day", "60-day", "90-day"
    data_source: string;          // "erp_export" | "procurement_api" | "invoice_analysis"
    third_party_verified: boolean; // Auditor sign-off for large claims
  };
  timestamp: Date;
  billed: boolean;
}
```

### Pricing Formula

```
Monthly Fee = Base Fee + (Total Verified Savings × Fee Percentage)
            = $100 + (Σ savings_cents × 0.15) / 100

Minimum:  $100 (if no savings delivered)
Maximum:  No hard cap (but naturally self-limiting — once savings dry up, customer leaves)
```

### Examples

| Verified Savings | Calculation | Monthly Cost | Notes |
|------------------|-------------|--------------|-------|
| $0 | $100 + $0 | **$100.00** | Pilot month, no changes implemented yet |
| $5,000 | $100 + ($5k × 15%) | **$850.00** | Small optimization |
| $20,000 | $100 + ($20k × 15%) | **$3,100.00** | Major shift or supplier consolidation |
| $100,000 | $100 + ($100k × 15%) | **$15,100.00** | Significant procurement transformation |

## Database Schema

### New Tables

**`savings_verification_events`** (similar to usageEvents, but for savings)

```sql
CREATE TABLE savings_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  advisor_recommendation_id VARCHAR NOT NULL REFERENCES advisor_recommendations(id),
  savings_amount_cents INTEGER NOT NULL,
  
  -- Evidence Chain
  baseline_spend_cents INTEGER NOT NULL,     -- Monthly spend before change
  actual_spend_cents INTEGER NOT NULL,       -- Monthly spend after change
  measurement_period_days INTEGER DEFAULT 30, -- How long measured (30/60/90)
  data_source VARCHAR NOT NULL,              -- "erp_export" | "api" | "invoice_analysis"
  
  -- Verification
  third_party_auditor_id VARCHAR,            -- If > $100K, requires audit
  auditor_approval_at TIMESTAMP,             -- When auditor signed off
  trust_score DECIMAL(3,2),                  -- 0.0–1.0 confidence in savings
  
  -- Stripe Sync
  reported_to_stripe BOOLEAN DEFAULT false,
  stripe_meter_event_id VARCHAR,
  
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**`companies` table extension:**

```sql
ALTER TABLE companies ADD COLUMN
  verified_savings_total_cents INTEGER DEFAULT 0 NOT NULL;  -- YTD total for dashboard
```

### Existing Reuse

- `usageEvents`: Repurposed for savings tracking (metricType = "verified_savings")
- `invoices`: Breakdown shows performance fee = (verified_savings × 0.15)
- Subscriptions: Already has `planId = "performance"` with baseFeeCents = 10000

## Implementation Roadmap

### Phase 1: Infrastructure (v1.0 - Post-MVP)
- [ ] Create `savings_verification_events` table (Drizzle migration)
- [ ] Create Stripe meter: `verified_savings_per_month`
- [ ] Create metered price on Performance product
- [ ] Implement `recordSavingsEvent(companyId, recommendation, evidence)` function

### Phase 2: Measurement Engine (v1.1)
- [ ] Build savings measurement logic: baseline → change → actual spend comparison
- [ ] Integrate with ERP APIs (Netsuite, SAP, etc.) for cost data pull
- [ ] Implement time-lag handling (savings show up 30-90 days later)
- [ ] Dashboard display: Verified Savings graph + estimated monthly charge

### Phase 3: Verification & Audit (v1.2)
- [ ] Implement automated flagging for anomalies (>5× historical average)
- [ ] Audit workflow for claims > $100K
- [ ] Customer dispute flow (trigger investigation, temporary hold on fee)
- [ ] Third-party auditor integration (if needed)

### Phase 4: Optimization (v2.0)
- [ ] Dynamic fee tiers (earn higher % as customer saves more)
- [ ] Volume discounts (if customer consolidates multiple recommendations)
- [ ] Savings acceleration: charge fee earlier if measured within 30 days
- [ ] Predictive UI: "You'll save ~$X; we'll earn ~$Y"

## Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Customer disputes savings legitimacy | High | Transparent evidence chain; monthly disputes window |
| Savings spike > normal (5× avg) | Medium | Flag for audit; hold fee pending investigation |
| Time lag misses revenue (customer leaves before savings measured) | Medium | Offer "provisional" fee based on recommendation strength |
| Gaming: inflate baseline to exaggerate savings | Medium | Control baseline (system-captured from month before change) |
| Audit cost > fee revenue | Low | Only audit > $100K; use sampling for smaller claims |
| Integration failure (can't get cost data from ERP) | Medium | Fallback to invoice analysis; manual upload option |

## FAQ

**Q: What if a recommendation doesn't deliver savings?**  
A: No fee. The savings event is never created; nothing reported to Stripe.

**Q: Can customers dispute a savings record?**  
A: Yes. Dispute window: 30 days after savings event created. We investigate; if legit issue found, fee reversed.

**Q: What about partial savings (e.g., customer only adopts 50% of recommendation)?**  
A: Record actual measured savings (not theoretical). Fee reflects reality.

**Q: How do we handle multi-part recommendations (e.g., 3 supplier changes over 2 months)?**  
A: Each change tracked separately. Savings events aggregate at month end; one invoice line shows total.

**Q: What's the baseline? What if customer increased spend intentionally?**  
A: Baseline = average 3-month spend before recommendation implemented. Allows legitimate business growth; detects gaming.

## Future Enhancements

- **Predictive Pricing**: "Based on your FDR trend, expect $X savings/mo → we'll earn $Y/mo"
- **Risk-Sharing**: Lower fee % for higher-risk recommendations (speculative savings)
- **Savings Bonds**: Customer buys insurance against recommendation failure; lower fee if they do
- **Tiered Auditing**: Light auto-audit for $0–100K; full third-party for $100K+

---

**Linked Documents:**
- [usage-metering.md](./usage-metering.md) — Usage-Based plan (active)
- [billing-service.ts](../server/lib/billingService.ts) — Plan configurations
- [performanceBillingService.ts](../server/lib/performanceBillingService.ts) — Savings fee calculations (v0)

**Owner:** Billing Engineering  
**Last Updated:** 2026-04-13  
**Version:** 0.1 (Design Phase)
