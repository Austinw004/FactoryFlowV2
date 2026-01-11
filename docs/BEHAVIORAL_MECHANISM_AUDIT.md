# Behavioral Mechanism Audit

**Date**: 2026-01-11  
**Purpose**: Containment and clarity before expansion  
**Status**: ACTIVE AUDIT - Review before any further learning implementation

---

## Executive Summary

This audit identifies all mechanisms in the system that record, transform, or act upon user behavior, usage patterns, or decision sequences. Each mechanism is classified for containment.

---

## MECHANISM INVENTORY

### 1. RegimeIntelligence.updateRegimeFactorFromAccuracy

**Location**: `server/lib/regimeIntelligence.ts:482-495`

| Attribute | Value |
|-----------|-------|
| **What it observes** | Predicted vs actual forecast values |
| **When it activates** | After every forecast-to-actual comparison |
| **What it modifies** | `historicalRegimeAccuracy[regime].factor` (0.8-1.2 range) |
| **Effects visibility** | **AMBIGUOUS** - Affects forecast multipliers which flow to user-visible forecasts |
| **Opacity** | **TRANSPARENT** - Simple error-based adjustment formula |

**Boundary Violation Assessment**: 
- **POTENTIAL VIOLATION** - This modifies a factor that influences forecast outputs based on prediction accuracy, which is derived from comparison to actual user-reported demand.
- The factor adjustment (-error * 0.1) is bounded but still constitutes learning that could compound over time.
- User behavior (reporting actual demand) indirectly influences model outputs.

**Quarantine Recommendation**: MONITOR - Document inputs/outputs, consider making factor static.

---

### 2. RegimeIntelligence.historicalRegimeAccuracy

**Location**: `server/lib/regimeIntelligence.ts:97-102`

| Attribute | Value |
|-----------|-------|
| **What it observes** | Prediction count, correct count per regime |
| **When it activates** | Passive storage, updated by `updateRegimeFactorFromAccuracy` |
| **What it modifies** | Per-regime accuracy tracking |
| **Effects visibility** | **INTERNAL-ONLY** - Data structure, no direct user exposure |
| **Opacity** | **TRANSPARENT** - Simple counter structure |

**Boundary Violation Assessment**: 
- Stores metadata about predictions, does not directly alter regime definitions.
- However, the `factor` field IS used in `getOptimizedRegimeFactor()` which affects forecasts.

**Quarantine Recommendation**: DOCUMENT - Track factor drift over time.

---

### 3. getConfidenceAdjustmentFromBehavior

**Location**: `server/lib/behavioralObservation.ts:436-455`

| Attribute | Value |
|-----------|-------|
| **What it observes** | Aggregated behavioral patterns (override rates, latency, dominant patterns) |
| **When it activates** | On-demand via `/api/behavioral/confidence-adjustment` endpoint |
| **What it modifies** | Returns adjustment factor (-0.1 to +0.05) |
| **Effects visibility** | **INTERNAL-ONLY** - Currently only exposed via internal diagnostic API |
| **Opacity** | **TRANSPARENT** - Clear thresholds and bounded output |

**Boundary Violation Assessment**: 
- **COMPLIANT** - Bounded learning as specified. Adjusts confidence, does not redefine regimes.
- Minimum 50 observations required before any adjustment.
- Adjustments are minor (-0.1 to +0.05 range).

**Current Usage**: NOT currently wired into any user-facing output path. Exists only as internal diagnostic.

**Quarantine Recommendation**: NONE - Properly isolated, but verify it remains unwired from user-facing paths.

---

### 4. AIAssistantService.conversationHistory

**Location**: `server/lib/aiAssistant.ts:627`

| Attribute | Value |
|-----------|-------|
| **What it observes** | User messages and assistant responses per conversation |
| **When it activates** | Every chat message exchange |
| **What it modifies** | Accumulates conversation context for LLM calls |
| **Effects visibility** | **USER-VISIBLE** - Directly influences AI responses |
| **Opacity** | **TRANSPARENT** - Simple message array, no transformation |

**Boundary Violation Assessment**: 
- **NOT APPLICABLE** - This is session-scoped conversation memory, not behavioral learning.
- Memory is scoped to individual conversation sessions, not persistent.
- Does not influence regime calculations or model logic.

**Quarantine Recommendation**: NONE - Standard conversation continuity, not behavioral learning.

---

### 5. RegimeIntelligence.fdrHistory

**Location**: `server/lib/regimeIntelligence.ts:93`

| Attribute | Value |
|-----------|-------|
| **What it observes** | FDR snapshots over time (up to 365 days) |
| **When it activates** | On `recordFDRSnapshot()` call |
| **What it modifies** | Accumulates FDR history for trend analysis |
| **Effects visibility** | **USER-VISIBLE** - FDR trends inform procurement timing signals |
| **Opacity** | **TRANSPARENT** - Simple time-series storage |

**Boundary Violation Assessment**: 
- **COMPLIANT** - This is model data (FDR values), not user behavior.
- FDR is calculated from external economic indicators, not user actions.
- History is used for trend analysis, not behavioral adjustment.

**Quarantine Recommendation**: NONE - Core model data, not behavioral learning.

---

### 6. Behavioral Observation Tables (6 tables)

**Location**: `shared/schema.ts` (behavioral_* tables)

| Table | What it observes | Visibility | Opacity |
|-------|------------------|------------|---------|
| `behavioral_regime_snapshots` | FDR/regime state at observation time | INTERNAL-ONLY | TRANSPARENT |
| `behavioral_signal_exposures` | When users see regime signals | INTERNAL-ONLY | TRANSPARENT |
| `behavioral_user_actions` | What users do after exposure | INTERNAL-ONLY | TRANSPARENT |
| `behavioral_signal_overrides` | Explicit disagreements with signals | INTERNAL-ONLY | TRANSPARENT |
| `behavioral_audit_trail` | Insight lineage traces | INTERNAL-ONLY | TRANSPARENT |
| `behavioral_pattern_aggregates` | Anonymized cross-org patterns | INTERNAL-ONLY | TRANSPARENT |

**Boundary Violation Assessment**: 
- **COMPLIANT** - Observation-only, no influence on model outputs.
- Anonymization via one-way hash prevents individual targeting.
- Pattern aggregation requires minimum 10 observations from 3+ organizations.

**Quarantine Recommendation**: NONE - Properly isolated from model logic.

---

### 7. aggregateBehavioralPatterns

**Location**: `server/lib/behavioralObservation.ts:287-375`

| Attribute | Value |
|-----------|-------|
| **What it observes** | User actions, latencies, override patterns |
| **When it activates** | On-demand (no scheduled aggregation currently) |
| **What it modifies** | Writes to `behavioral_pattern_aggregates` table |
| **Effects visibility** | **INTERNAL-ONLY** - No user-facing output |
| **Opacity** | **TRANSPARENT** - Clear SQL aggregation logic |

**Boundary Violation Assessment**: 
- **COMPLIANT** - Descriptive aggregation only.
- Requires minimum 10 observations and 3+ organizations.
- Does not influence recommendations or model outputs.

**Quarantine Recommendation**: NONE - Properly scoped.

---

## MECHANISMS REQUIRING ACTION

### HIGH PRIORITY: updateRegimeFactorFromAccuracy

**Issue**: Modifies forecast multipliers based on prediction accuracy, creating an implicit feedback loop.

**Callers**:
- `server/lib/forecasting.ts:110`
- `server/lib/economics.ts:137`

**Recommended Action**:
1. Document all calls and their contexts
2. Consider freezing factors to static values (make learning opt-in)
3. If learning is retained, add audit trail for factor changes
4. Ensure factors cannot drift below 0.8 or above 1.2 (currently bounded)

---

### MEDIUM PRIORITY: getConfidenceAdjustmentFromBehavior

**Issue**: Returns adjustment factor that COULD influence user-facing confidence scores if wired.

**Current State**: SAFE - Only exposed via internal diagnostic API, not wired to user-facing paths.

**Recommended Action**:
1. Add explicit guard preventing use in user-facing calculations
2. Document that this is diagnostic-only
3. Consider renaming to `_internalDiagnosticConfidenceAdjustment`

---

## BOUNDARY ENFORCEMENT RULES

### Model Logic (Fixed Ground Truth)
- FDR calculation formula
- Regime threshold definitions
- Transition prediction algorithms
- Procurement timing signal logic

These MUST NOT be modified by behavioral observation.

### Behavioral Observation (User Behavior as Variable)
- Signal exposure recording
- User action recording
- Override recording
- Pattern aggregation

These may observe and describe, but not influence.

### Bounded Learning Zone
- Confidence adjustments (-0.1 to +0.05)
- Requires minimum observation thresholds
- All adjustments are reversible
- All insights must trace to inputs → outputs → actions

---

## VERIFICATION CHECKLIST

Before any new behavioral learning is implemented:

- [ ] Is the mechanism observation-only or does it modify outputs?
- [ ] If it modifies outputs, is it bounded?
- [ ] Is there a minimum observation threshold?
- [ ] Can the effect be traced to specific inputs?
- [ ] Does the mechanism touch regime definitions, thresholds, or formulas?
- [ ] Is the mechanism exposed to user-facing interfaces?
- [ ] Can the effect be reversed or expired?

---

## AUDIT TRAIL REQUIREMENTS

All behavioral insights must include:

1. **Evidence count** - Number of observations supporting the insight
2. **Organization count** - Number of unique (anonymized) organizations
3. **Regime context** - Which regime(s) the pattern applies to
4. **Confidence level** - Statistical confidence in the pattern
5. **Invalidation criteria** - What evidence would invalidate the insight
6. **Expiration** - Insights expire after 90 days if not reinforced

---

## CONCLUSION

The system has **one mechanism requiring attention** (`updateRegimeFactorFromAccuracy`) that creates an implicit learning loop affecting user-facing forecasts. All other mechanisms are either:

1. **COMPLIANT** - Properly isolated behavioral observation
2. **NOT APPLICABLE** - Session-scoped context (conversation memory)
3. **MODEL DATA** - Core FDR/regime data, not behavioral

**Recommendation**: Freeze `updateRegimeFactorFromAccuracy` factors to static values until a decision is made about whether this learning is desirable and how it should be audited.
