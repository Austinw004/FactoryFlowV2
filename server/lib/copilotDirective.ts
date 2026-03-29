/**
 * PRESCIENT LABS COPILOT SYSTEM DIRECTIVE
 * Authoritative, non-negotiable enforcement layer for all AI copilot outputs.
 * Version: 1.0.0
 *
 * This directive governs every response produced by the AI assistant and
 * queryCopilot service. It is prepended verbatim to the system prompt
 * sent to the language model and drives server-side validation of all
 * copilot outputs.
 */

// ─── The directive text (injected verbatim as the first system block) ─────────

export const COPILOT_SYSTEM_DIRECTIVE = `SYSTEM DIRECTIVE: AI TRUTH, EVIDENCE, AND ROBUSTNESS ENFORCEMENT LAYER

You are the Prescient Labs Copilot operating inside a certified enterprise manufacturing intelligence system. You are NOT a general chatbot. You are a deterministic, evidence-first decision assistant.

NON-NEGOTIABLE RULES:

1. ZERO HALLUCINATION POLICY
- You MUST NOT generate, infer, or fabricate any data, metrics, forecasts, savings, costs, or facts.
- Every number must come from:
  (a) database query results
  (b) computed outputs from system functions
  (c) explicitly passed inputs
- If data is missing → respond with:
  "INSUFFICIENT_DATA: Cannot produce a verified answer."

2. EVIDENCE-FIRST RESPONSES (MANDATORY)
Every response MUST include:
- evidenceBundle:
  - sourceTables (array)
  - entityIds (array)
  - queryTimestamp (ISO string)
  - rowCount (integer)
  - provenanceVersion
- keyDrivers (max 5 bullet explanations with numeric values)
- riskFactors (explicit uncertainties or weaknesses)
- trustScore (0.0–1.0)

If any of the above are missing → BLOCK RESPONSE.

3. TRUST SCORE ENFORCEMENT
- trustScore >= 0.6 → normal response
- 0.4 <= trustScore < 0.6 → respond BUT mark:
  "LOW CONFIDENCE – APPROVAL REQUIRED"
- trustScore < 0.4 → THROW:
  LOW_TRUST_BLOCKED_DECISION

4. NO SILENT FALLBACKS
The following are STRICTLY FORBIDDEN:
- default constants (e.g. unitCost = 10)
- proxy logic (e.g. avgDemand = onHand * X)
- empty arrays used as real data
- backfilling missing values silently

If encountered → THROW:
DATA_INTEGRITY_VIOLATION

5. ECONOMIC VALIDITY CHECK (MANDATORY)
Before returning ANY financial or operational output:
- values must be finite numbers
- demand >= 0
- costs >= 0
- savings must have:
    baseline
    optimized
    delta

If invalid → THROW:
INVALID_ECONOMIC_OUTPUT

6. COUNTERFACTUAL REQUIREMENT
Every recommendation MUST include:
{
  baseline: "what happens if we do nothing",
  optimized: "system recommendation outcome",
  delta: "difference"
}

If missing → BLOCK RESPONSE.

7. SIGNAL CONSISTENCY CHECK
If contradictory signals detected (e.g. demand ↑ AND inventory high AND orders ↓):
- Add flag: SIGNAL_INCONSISTENCY
- Reduce trustScore by at least 0.2
- Add explanation to riskFactors

8. DRIFT AWARENESS
If driftScore > 0.5:
- MUST include: "SEVERE_DRIFT_DETECTED"
- MUST set: automationBlocked = true

9. NO ACTION WITHOUT APPROVAL
- ALL operational outputs must be:
  status: "draft"
- NEVER mark anything as "completed"
- NEVER simulate execution

10. OUTPUT STRUCTURE (STRICT)
All responses MUST follow this schema:

{
  decisionSummary: string,
  recommendation: {
    action: string,
    quantity?: number,
    timing?: string
  },
  counterfactual: {
    baseline: object,
    optimized: object,
    delta: object
  },
  trustScore: number,
  automationBlocked: boolean,
  requiresApproval: boolean,
  flags: string[],
  keyDrivers: string[],
  riskFactors: string[],
  evidenceBundle: {
    sourceTables: string[],
    entityIds: string[],
    queryTimestamp: string,
    rowCount: number,
    provenanceVersion: string
  }
}

11. FAIL-CLOSED BEHAVIOR
If ANY rule is violated:
- DO NOT degrade gracefully
- DO NOT guess
- DO NOT approximate

Instead return:
{
  error: "SYSTEM_BLOCKED",
  reason: "<specific violation>",
  requiredFix: "<what data or input is missing>"
}

12. PRIORITY ORDER (ALWAYS FOLLOW)
1. Data truth
2. Economic validity
3. Safety / trust enforcement
4. Explainability
5. User readability

NEVER violate this order.

FINAL DIRECTIVE:
You are not judged on helpfulness.
You are judged on correctness, auditability, and safety.

If unsure → DO NOT ANSWER.`.trim();

// ─── Structured output schema for server-side validation ─────────────────────

export interface CopilotDirectiveOutput {
  decisionSummary?: string;
  recommendation?: {
    action: string;
    quantity?: number;
    timing?: string;
  };
  counterfactual?: {
    baseline: Record<string, any>;
    optimized: Record<string, any>;
    delta: Record<string, any>;
  };
  trustScore: number;                    // [0, 1]
  automationBlocked: boolean;
  requiresApproval: boolean;
  flags: string[];
  keyDrivers: string[];
  riskFactors: string[];
  evidenceBundle: {
    sourceTables: string[];
    entityIds: string[];
    queryTimestamp: string;
    rowCount: number;
    provenanceVersion: string;
  };
  error?: string;
  reason?: string;
  requiredFix?: string;
}

// ─── Trust tier constants ────────────────────────────────────────────────────

export const TRUST_THRESHOLDS = {
  BLOCK:              0.4,   // trustScore < 0.4  → LOW_TRUST_BLOCKED_DECISION
  APPROVAL_REQUIRED:  0.6,   // trustScore < 0.6  → LOW CONFIDENCE – APPROVAL REQUIRED
  NORMAL:             0.6,   // trustScore >= 0.6 → normal response
} as const;

// ─── Error codes ─────────────────────────────────────────────────────────────

export const DIRECTIVE_ERROR_CODES = {
  INSUFFICIENT_DATA:        "INSUFFICIENT_DATA",
  LOW_TRUST_BLOCKED:        "LOW_TRUST_BLOCKED_DECISION",
  DATA_INTEGRITY_VIOLATION: "DATA_INTEGRITY_VIOLATION",
  INVALID_ECONOMIC_OUTPUT:  "INVALID_ECONOMIC_OUTPUT",
  SYSTEM_BLOCKED:           "SYSTEM_BLOCKED",
  SIGNAL_INCONSISTENCY:     "SIGNAL_INCONSISTENCY",
  SEVERE_DRIFT_DETECTED:    "SEVERE_DRIFT_DETECTED",
} as const;

// ─── Server-side validation helpers ──────────────────────────────────────────

/**
 * Validate that a numeric value is a valid finite non-negative number.
 * Throws DATA_INTEGRITY_VIOLATION if not.
 */
export function assertFiniteNonNegative(value: number, label: string): void {
  if (!isFinite(value) || isNaN(value)) {
    throw new Error(`${DIRECTIVE_ERROR_CODES.INVALID_ECONOMIC_OUTPUT}: ${label} is non-finite (${value})`);
  }
  if (value < 0) {
    throw new Error(`${DIRECTIVE_ERROR_CODES.INVALID_ECONOMIC_OUTPUT}: ${label} must be >= 0 (got ${value})`);
  }
}

/**
 * Enforce trust-score tier rules.
 * Returns a flag string if a warning tier is hit, throws if blocked tier is hit.
 */
export function enforceTrustTier(trustScore: number): string | null {
  if (trustScore < TRUST_THRESHOLDS.BLOCK) {
    throw new Error(`${DIRECTIVE_ERROR_CODES.LOW_TRUST_BLOCKED}: trustScore=${trustScore.toFixed(2)} < ${TRUST_THRESHOLDS.BLOCK}`);
  }
  if (trustScore < TRUST_THRESHOLDS.APPROVAL_REQUIRED) {
    return "LOW CONFIDENCE – APPROVAL REQUIRED";
  }
  return null;
}

/**
 * Detect contradictory signals in a set of indicators.
 * Returns true and a description if inconsistency is found.
 */
export function detectSignalInconsistency(signals: {
  demandTrend?: "up" | "down" | "flat";
  inventoryLevel?: "high" | "low" | "normal";
  orderTrend?: "up" | "down" | "flat";
}): { inconsistent: boolean; description: string } {
  const issues: string[] = [];
  if (
    signals.demandTrend === "up" &&
    signals.inventoryLevel === "high" &&
    signals.orderTrend === "down"
  ) {
    issues.push("demand trending up while inventory is high and orders declining");
  }
  if (
    signals.demandTrend === "down" &&
    signals.inventoryLevel === "low" &&
    signals.orderTrend === "up"
  ) {
    issues.push("demand declining while inventory is low and orders rising");
  }
  return {
    inconsistent: issues.length > 0,
    description: issues.join("; "),
  };
}

/**
 * Build a SYSTEM_BLOCKED error response (fail-closed, per rule #11).
 */
export function buildBlockedResponse(reason: string, requiredFix: string): CopilotDirectiveOutput {
  return {
    trustScore:        0,
    automationBlocked: true,
    requiresApproval:  true,
    flags:             [DIRECTIVE_ERROR_CODES.SYSTEM_BLOCKED],
    keyDrivers:        [],
    riskFactors:       [reason],
    evidenceBundle: {
      sourceTables:     [],
      entityIds:        [],
      queryTimestamp:   new Date().toISOString(),
      rowCount:         0,
      provenanceVersion: "DIRECTIVE_V1",
    },
    error:       DIRECTIVE_ERROR_CODES.SYSTEM_BLOCKED,
    reason,
    requiredFix,
  };
}

/**
 * Build a minimal evidence bundle for the directive output schema.
 */
export function buildDirectiveEvidenceBundle(opts: {
  sourceTables: string[];
  entityIds: string[];
  rowCount: number;
}): CopilotDirectiveOutput["evidenceBundle"] {
  return {
    sourceTables:     opts.sourceTables,
    entityIds:        opts.entityIds,
    queryTimestamp:   new Date().toISOString(),
    rowCount:         opts.rowCount,
    provenanceVersion: "DIRECTIVE_V1",
  };
}
