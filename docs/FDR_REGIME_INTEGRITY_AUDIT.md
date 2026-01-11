# FDR Regime System Integrity Audit & Remediation Report

**Audit Date**: 2026-01-11  
**Mandate**: Restore theoretical fidelity before performance optimization  
**Status**: CRITICAL ISSUES IDENTIFIED - REMEDIATION REQUIRED

---

## EXECUTIVE SUMMARY

This audit reveals **fundamental structural defects** that prevent meaningful predictive validity assessment. The regime classification system contains at least three conflicting threshold definitions, producing incoherent signals. No claims of predictive utility are valid until these defects are remediated.

---

## SECTION 1: THRESHOLD RECONCILIATION

### 1.1 Conflicting Threshold Definitions Found

| Source File | HEALTHY_EXPANSION | ASSET_LED_GROWTH | IMBALANCED_EXCESS | REAL_ECONOMY_LEAD |
|-------------|-------------------|------------------|-------------------|-------------------|
| **economics.ts:157-170** (CANONICAL) | FDR < 1.2 | 1.2 ≤ FDR < 1.8 | 1.8 ≤ FDR < 2.5 | FDR ≥ 2.5 |
| **regimeIntelligence.ts:67-72** | 0.0 - 1.2 | 1.2 - 1.8 | 1.8 - 2.5 | 2.5 - 10.0 |
| **fdrStressTest.ts:60-65** (INVERTED) | 0.8 - 1.5 | 1.5 - 2.0 | FDR > 2.0 | **FDR < 0.8** |
| **fdrStressTest.ts:129-134** (helper) | default | FDR > 1.5 | FDR > 2.0 | **FDR < 0.8** |
| **fdrStressTest.ts:633-636** (mock) | default | FDR > 1.5 | FDR > 2.0 | **FDR < 0.8** |

### 1.2 Critical Defect: REAL_ECONOMY_LEAD Interpretation

**Canonical Theory (economics.ts)**: REAL_ECONOMY_LEAD occurs when FDR ≥ 2.5 (asset circuit massively exceeds real circuit, counter-cyclical opportunity)

**fdrStressTest.ts Interpretation**: REAL_ECONOMY_LEAD occurs when FDR < 0.8 (real circuit dominates, opposite condition)

**This is OPPOSITE LOGIC**. These cannot both be correct.

### 1.3 Database Evidence of Threshold Violation

| Regime in DB | FDR Range Observed | Canonical FDR Range | Verdict |
|--------------|-------------------|---------------------|---------|
| REAL_ECONOMY_LEAD | 0.20 - 0.40 | 2.5 - 10.0 | **INVERTED** |
| HEALTHY_EXPANSION | 0.997 | 0.0 - 1.2 | CORRECT |
| ASSET_LED_GROWTH | 1.04 - 1.29 | 1.2 - 1.8 | **PARTIAL VIOLATION** (1.04 < 1.2) |
| IMBALANCED_EXCESS | 1.52 - 3.22 | 1.8 - 2.5 | **PARTIAL VIOLATION** (1.52 < 1.8, 3.22 > 2.5) |

### 1.4 Root Cause Hypothesis

The external data source (`api.factoryofthefuture.ai/economic-indicators`) appears to be classifying regimes using the **fdrStressTest.ts thresholds** rather than the canonical economics.ts thresholds. The stored `regime` field is being accepted without validation against local threshold logic.

---

## SECTION 2: REGIME PERSISTENCE CONSTRAINTS

### 2.1 Current State: No Persistence Enforcement

The system allows regime changes on every FDR update with no:
- Minimum duration constraint
- Hysteresis bands
- Transition confirmation window
- Debouncing logic

### 2.2 Observed Flickering Pattern

```
Dec 6-9:   REAL_ECONOMY_LEAD
Dec 11:    ASSET_LED_GROWTH     (transition)
Dec 14:    REAL_ECONOMY_LEAD    (reversion after 3 days)
Dec 19-22: IMBALANCED_EXCESS    (transition)
Dec 23:    ASSET_LED_GROWTH     (reversion after 4 days)
Dec 27-28: IMBALANCED_EXCESS    (transition)
Jan 1:     REAL_ECONOMY_LEAD    (transition after 4 days)
Jan 4:     IMBALANCED_EXCESS    (reversion after 3 days)
Jan 7-8:   HEALTHY_EXPANSION    (transition)
Jan 9:     REAL_ECONOMY_LEAD    (reversion after 2 days)
Jan 10-11: ASSET_LED_GROWTH     (transition)
```

**Finding**: 10+ regime transitions in 37 days, with typical reversions occurring within 2-4 days

**Theoretical Typical Durations**:
- HEALTHY_EXPANSION: 540 days
- ASSET_LED_GROWTH: 270 days  
- IMBALANCED_EXCESS: 180 days
- REAL_ECONOMY_LEAD: 120 days

**Deviation Factor**: Observed persistence is 30-180x shorter than theoretical

### 2.3 Required Persistence Constraints

1. **Minimum Duration**: Regime cannot change within 14 days of last transition
2. **Hysteresis Band**: FDR must move 0.15 beyond threshold to trigger transition
3. **Confirmation Window**: New regime must persist for 3 consecutive readings before commitment
4. **Reversion Penalty**: Return to previous regime requires 2x the normal threshold crossing

---

## SECTION 3: PREDICTIVE VALIDITY UNDER CONSTRAINTS

### 3.1 Pre-Remediation Assessment: CANNOT EVALUATE

The current system cannot be evaluated for predictive validity because:
1. Regime labels in database do not match FDR values
2. External data source uses unknown threshold definitions
3. Signal flickering renders all signals non-actionable

### 3.2 Post-Remediation Requirements

After threshold reconciliation and persistence enforcement:
1. Re-classify all historical data using canonical thresholds
2. Apply persistence filters retroactively
3. Count remaining regime transitions
4. Evaluate timing of transitions vs. observable outcomes

### 3.3 Expected Impact of Remediation

| Metric | Current | Expected Post-Fix |
|--------|---------|-------------------|
| Regime transitions (37 days) | 10+ | 0-2 |
| Average regime duration | 3-4 days | 30+ days |
| Signal actionability | None | Potentially useful |
| FDR-regime consistency | ~25% | 100% |

---

## SECTION 4: BASELINE COMPARISON REFRAMING

### 4.1 Incorrect Comparison: Raw FDR Prediction

Testing whether regime signals predict FDR is tautological - regime is derived from FDR.

### 4.2 Correct Comparison: Decision Discipline

The regime layer should be evaluated on whether it:
1. **Reduces false transitions** compared to raw threshold crossings
2. **Improves stability** of procurement signals
3. **Adds interpretability** for non-technical users
4. **Enables consistent policy** by smoothing noise

### 4.3 Baseline Test Design

| Test | Baseline | Regime System | Metric |
|------|----------|---------------|--------|
| Signal changes per month | Raw FDR crossings | Persistence-filtered transitions | Fewer = better |
| Actionable signal duration | Days above/below threshold | Regime duration | Longer = better |
| False reversal rate | Crossing + immediate reversion | Confirmed transitions | Lower = better |

---

## SECTION 5: THEORY PRESERVATION

### 5.1 Constraints

Per directive, the following MUST NOT be modified:
- Regime definitions (HEALTHY_EXPANSION, ASSET_LED_GROWTH, IMBALANCED_EXCESS, REAL_ECONOMY_LEAD)
- Conceptual framework (Dual-Circuit FDR model)
- Threshold values (0, 1.2, 1.8, 2.5) once reconciled

### 5.2 Permitted Modifications

- Consolidating threshold definitions to single source of truth
- Adding persistence logic (does not change regime definitions)
- Fixing data ingestion to validate regime classifications
- Adding logging/audit capabilities

---

## SECTION 6: FUTURE VALIDATION PREPARATION

### 6.1 Required Logging

All regime outputs must record:
- Timestamp
- FDR value
- Computed regime (local)
- Received regime (external, if different)
- Confidence score
- Procurement signal issued
- Days in current regime

### 6.2 Required Linkage

Future validation requires linking to:
- User procurement decisions (timestamp, SKU, quantity, price)
- Signal override events (user rejected recommendation)
- Price outcomes (30/60/90 day forward prices)
- Inventory stress events

### 6.3 Provisional Utility Statement

Until behavioral outcome data exists, all claims of operational utility are **EXPLICITLY PROVISIONAL**. The system may behave like a regime framework, but its value in improving decisions is unknown.

---

## SECTION 7: REMEDIATION ACTIONS

### 7.1 Immediate (Critical)

1. **Consolidate thresholds** into single source: `REGIME_THRESHOLDS` constant exported from `economics.ts`
2. **Validate external data**: Reject or re-classify regime if FDR doesn't match canonical thresholds
3. **Add persistence filter**: Minimum 14-day hold before regime change
4. **Log threshold violations**: Record when external source disagrees with local classification

### 7.2 Short-Term (Required)

1. **Re-classify historical data**: Apply canonical thresholds to all economic_snapshots
2. **Implement hysteresis**: 0.15 FDR buffer around thresholds
3. **Add confirmation window**: 3-reading confirmation before transition
4. **Create regime transition audit log**

### 7.3 Medium-Term (Validation)

1. **Collect 12+ months** of persistence-filtered regime data
2. **Instrument behavioral tracking**: User actions linked to regime signals
3. **Baseline comparison**: Raw vs. filtered transition counts
4. **Outcome tracking**: Price movements following regime signals

---

## SECTION 8: CONCLUSIONS

### 8.1 Current System State

**STRUCTURALLY INCOHERENT** - Cannot be evaluated for predictive validity due to:
- Conflicting threshold definitions across modules
- FDR-regime mismatch in stored data
- No persistence enforcement
- Signal flickering making all signals non-actionable

### 8.2 Path to Validity

1. Fix threshold definitions (1 day)
2. Add persistence filters (1 day)
3. Re-classify historical data (1 day)
4. Collect 12+ months of clean data (12 months)
5. Evaluate predictive validity (1 month)

### 8.3 Governing Principle Applied

> "A regime framework must first behave like a regime framework before it can be judged on predictive performance. Structural coherence precedes statistical validation."

Current status: **Structural coherence NOT achieved**. All predictive validity testing is premature until remediation is complete.

---

**Document Version**: 1.0  
**Audit Methodology**: Per internal model-integrity directive  
**Theory Modified**: NO  
**Parameters Optimized**: NO  
**Honest Assessment**: YES
