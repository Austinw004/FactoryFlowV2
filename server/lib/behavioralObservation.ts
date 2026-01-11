/**
 * BEHAVIORAL OBSERVATION SYSTEM
 * 
 * Purpose: Build longitudinal dataset of decision behavior under varying macroeconomic regimes.
 * 
 * CRITICAL CONSTRAINTS:
 * - Model logic is fixed ground truth; user behavior is the variable
 * - This system OBSERVES, not INFLUENCES
 * - No nudging, no optimization for outcomes
 * - All data anonymized at organizational level
 * - Full audit trail required for every insight
 * - Learning is diagnostic, not prescriptive
 */

import { db } from "../db";
import {
  behavioralRegimeSnapshots,
  behavioralSignalExposures,
  behavioralUserActions,
  behavioralSignalOverrides,
  behavioralAuditTrail,
  behavioralPatternAggregates,
  type InsertBehavioralRegimeSnapshot,
  type InsertBehavioralSignalExposure,
  type InsertBehavioralUserAction,
  type InsertBehavioralSignalOverride,
  type InsertBehavioralAuditTrail,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { createHash } from "crypto";

// ============================================================================
// ANONYMIZATION
// ============================================================================

/**
 * Anonymize organization ID using one-way hash.
 * Cannot be reversed to original company ID.
 */
export function anonymizeOrgId(companyId: string): string {
  const salt = process.env.BEHAVIORAL_SALT || "prescient-behavioral-observation";
  return createHash("sha256").update(`${salt}:${companyId}`).digest("hex").slice(0, 32);
}

// ============================================================================
// REGIME SNAPSHOT CAPTURE
// Model logic is fixed ground truth - this captures state, not interpretation
// ============================================================================

export interface RegimeState {
  fdrValue: number;
  regimeType: string;
  confidenceLevel: number;
  robustnessScore?: number;
  nullTestPassed?: boolean;
  thresholdConsistent?: boolean;
  classifiedFailures?: any[];
  confidenceCap?: number;
  indicators?: {
    m2Growth?: number;
    fedFundsRate?: number;
    cpiYoY?: number;
    unemploymentRate?: number;
  };
}

/**
 * Capture immutable regime snapshot at observation time.
 * This is the fixed ground truth for behavioral observation.
 */
export async function captureRegimeSnapshot(state: RegimeState): Promise<string> {
  // CRITICAL: Validation flags must be null when not provided, not coerced to 0.
  // Coercing undefined to 0 would falsely indicate failed checks, violating
  // the "records without reinterpretation" requirement.
  const snapshot: InsertBehavioralRegimeSnapshot = {
    fdrValue: state.fdrValue,
    regimeType: state.regimeType,
    confidenceLevel: state.confidenceLevel,
    robustnessScore: state.robustnessScore ?? null,
    // Only record validation flags when explicitly provided
    nullTestPassed: state.nullTestPassed === undefined ? null : (state.nullTestPassed ? 1 : 0),
    thresholdConsistent: state.thresholdConsistent === undefined ? null : (state.thresholdConsistent ? 1 : 0),
    classifiedFailures: state.classifiedFailures ?? null,
    confidenceCap: state.confidenceCap ?? null,
    m2Growth: state.indicators?.m2Growth ?? null,
    fedFundsRate: state.indicators?.fedFundsRate ?? null,
    cpiYoY: state.indicators?.cpiYoY ?? null,
    unemploymentRate: state.indicators?.unemploymentRate ?? null,
    snapshotTimestamp: new Date(),
  };

  const [result] = await db.insert(behavioralRegimeSnapshots).values(snapshot).returning({ id: behavioralRegimeSnapshots.id });
  return result.id;
}

// ============================================================================
// SIGNAL EXPOSURE RECORDING
// Records when user was exposed to a regime signal - factual, not interpretive
// ============================================================================

export type ExposureType = "dashboard_view" | "api_call" | "alert_received" | "report_generated";
export type SignalCategory = "regime_change" | "confidence_update" | "procurement_timing" | "risk_alert";

export interface SignalExposureEvent {
  companyId: string;
  regimeSnapshotId: string;
  exposureType: ExposureType;
  signalCategory: SignalCategory;
  signalContent: any;
  sessionId?: string;
  dwellTimeMs?: number;
}

/**
 * Record signal exposure event.
 * Purpose: observe what signals users see, not influence what they do.
 */
export async function recordSignalExposure(event: SignalExposureEvent): Promise<string> {
  const exposure: InsertBehavioralSignalExposure = {
    anonymizedOrgId: anonymizeOrgId(event.companyId),
    regimeSnapshotId: event.regimeSnapshotId,
    exposureType: event.exposureType,
    signalCategory: event.signalCategory,
    signalContent: event.signalContent,
    sessionId: event.sessionId ?? null,
    dwellTimeMs: event.dwellTimeMs ?? null,
    exposureTimestamp: new Date(),
  };

  const [result] = await db.insert(behavioralSignalExposures).values(exposure).returning({ id: behavioralSignalExposures.id });
  
  console.log(`[BehavioralObservation] Signal exposure recorded: ${event.exposureType}/${event.signalCategory}`);
  return result.id;
}

// ============================================================================
// USER ACTION RECORDING
// Records actions taken after signal exposure - without judgment or reinterpretation
// ============================================================================

export type ActionType = "follow_signal" | "ignore_signal" | "override_signal" | "delay_action" | "contradict_signal" | "no_action";
export type ActionCategory = "procurement" | "inventory" | "supplier" | "budget" | "forecast_adjustment";

export interface UserActionEvent {
  companyId: string;
  signalExposureId?: string;
  regimeSnapshotId: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  latencyMs?: number;
  actionDetails: any;
  operationalContext?: {
    skus?: string[];
    costs?: Record<string, number>;
    leadTimes?: Record<string, number>;
    capacityConstraints?: any;
  };
}

/**
 * Record user action event.
 * If user ignores, overrides, delays, or contradicts a signal, record without judgment.
 * Silence or inaction is itself a meaningful data point.
 */
export async function recordUserAction(event: UserActionEvent): Promise<string> {
  const action: InsertBehavioralUserAction = {
    anonymizedOrgId: anonymizeOrgId(event.companyId),
    signalExposureId: event.signalExposureId ?? null,
    regimeSnapshotId: event.regimeSnapshotId,
    actionType: event.actionType,
    actionCategory: event.actionCategory,
    latencyMs: event.latencyMs ?? null,
    actionDetails: event.actionDetails,
    operationalContext: event.operationalContext ?? null,
    actionTimestamp: new Date(),
  };

  const [result] = await db.insert(behavioralUserActions).values(action).returning({ id: behavioralUserActions.id });
  
  console.log(`[BehavioralObservation] User action recorded: ${event.actionType}/${event.actionCategory}`);
  return result.id;
}

// ============================================================================
// SIGNAL OVERRIDE RECORDING
// Explicit user decision to contradict system recommendation - factual, no judgment
// ============================================================================

export interface SignalOverrideEvent {
  companyId: string;
  signalExposureId?: string;
  regimeSnapshotId: string;
  systemRecommendation: any;
  userDecision: any;
  overrideType: "timing_change" | "quantity_change" | "supplier_change" | "cancel_action" | "proceed_against_signal";
  userProvidedReason?: string;
}

/**
 * Record explicit override of system recommendation.
 * This is valuable data - captures divergence between model output and user choice.
 */
export async function recordSignalOverride(event: SignalOverrideEvent): Promise<string> {
  const override: InsertBehavioralSignalOverride = {
    anonymizedOrgId: anonymizeOrgId(event.companyId),
    signalExposureId: event.signalExposureId ?? null,
    regimeSnapshotId: event.regimeSnapshotId,
    systemRecommendation: event.systemRecommendation,
    userDecision: event.userDecision,
    overrideType: event.overrideType,
    userProvidedReason: event.userProvidedReason ?? null,
    overrideTimestamp: new Date(),
  };

  const [result] = await db.insert(behavioralSignalOverrides).values(override).returning({ id: behavioralSignalOverrides.id });
  
  console.log(`[BehavioralObservation] Signal override recorded: ${event.overrideType}`);
  return result.id;
}

// ============================================================================
// AUDIT TRAIL
// Every insight must be traceable back to observed inputs, outputs, and actions
// ============================================================================

export interface InsightRecord {
  insightType: "execution_risk_pattern" | "confidence_adjustment" | "organizational_tendency";
  insightDescription: string;
  observedInputs: any;
  observedOutputs: any;
  observedActions: any;
  regimeConditions: any;
  signalExposureIds: string[];
  userActionIds: string[];
  evidenceCount: number;
  confidenceInInsight?: number;
}

/**
 * Create auditable insight record.
 * If an insight cannot be traced cleanly, it must not be retained.
 */
export async function createAuditedInsight(insight: InsightRecord): Promise<string | null> {
  // Validate traceability - insight must have evidence
  if (insight.evidenceCount < 3) {
    console.warn(`[BehavioralObservation] Insight rejected: insufficient evidence (${insight.evidenceCount} < 3)`);
    return null;
  }

  if (!insight.signalExposureIds.length || !insight.userActionIds.length) {
    console.warn(`[BehavioralObservation] Insight rejected: missing signal/action references`);
    return null;
  }

  const auditEntry: InsertBehavioralAuditTrail = {
    insightType: insight.insightType,
    insightDescription: insight.insightDescription,
    observedInputs: insight.observedInputs,
    observedOutputs: insight.observedOutputs,
    observedActions: insight.observedActions,
    regimeConditions: insight.regimeConditions,
    signalExposureIds: insight.signalExposureIds,
    userActionIds: insight.userActionIds,
    evidenceCount: insight.evidenceCount,
    confidenceInInsight: insight.confidenceInInsight ?? null,
    isReversible: 1, // All insights are reversible
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 day expiry
  };

  const [result] = await db.insert(behavioralAuditTrail).values(auditEntry).returning({ id: behavioralAuditTrail.id });
  
  console.log(`[BehavioralObservation] Audited insight created: ${insight.insightType}`);
  return result.id;
}

// ============================================================================
// PATTERN AGGREGATION
// Anonymized cross-organization patterns - never individual organizations
// ============================================================================

export type PatternType = "early_discipline" | "delayed_reaction" | "overconfidence" | "conservatism" | "internal_constraint";

/**
 * Aggregate behavioral patterns across organizations.
 * Purpose: reveal structural tendencies, not rank or promote participants.
 */
export async function aggregateBehavioralPatterns(
  regimeType: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Get all actions in period for this regime type
  const actions = await db
    .select()
    .from(behavioralUserActions)
    .innerJoin(
      behavioralRegimeSnapshots,
      eq(behavioralUserActions.regimeSnapshotId, behavioralRegimeSnapshots.id)
    )
    .where(
      and(
        eq(behavioralRegimeSnapshots.regimeType, regimeType),
        gte(behavioralUserActions.actionTimestamp, periodStart),
        lte(behavioralUserActions.actionTimestamp, periodEnd)
      )
    );

  if (actions.length < 10) {
    console.log(`[BehavioralObservation] Skipping aggregation: insufficient data (${actions.length} < 10)`);
    return;
  }

  // Count unique organizations
  const uniqueOrgs = new Set(actions.map(a => a.behavioral_user_actions.anonymizedOrgId));
  
  // Calculate aggregate metrics
  const followCount = actions.filter(a => a.behavioral_user_actions.actionType === "follow_signal").length;
  const overrideCount = actions.filter(a => a.behavioral_user_actions.actionType === "override_signal").length;
  const ignoreCount = actions.filter(a => 
    a.behavioral_user_actions.actionType === "ignore_signal" || 
    a.behavioral_user_actions.actionType === "no_action"
  ).length;

  const latencies = actions
    .map(a => a.behavioral_user_actions.latencyMs)
    .filter((l): l is number => l !== null);
  const avgLatency = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : null;

  const fdrValues = actions.map(a => a.behavioral_regime_snapshots.fdrValue);
  const avgFdr = fdrValues.reduce((a, b) => a + b, 0) / fdrValues.length;

  const confidenceValues = actions.map(a => a.behavioral_regime_snapshots.confidenceLevel);
  const avgConfidence = confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length;

  // Classify pattern type based on behavior distribution
  let patternType: PatternType;
  const followRate = followCount / actions.length;
  const overrideRate = overrideCount / actions.length;
  const ignoreRate = ignoreCount / actions.length;

  if (followRate > 0.7 && avgLatency !== null && avgLatency < 300000) {
    patternType = "early_discipline";
  } else if (avgLatency !== null && avgLatency > 1800000) {
    patternType = "delayed_reaction";
  } else if (overrideRate > 0.4) {
    patternType = "overconfidence";
  } else if (ignoreRate > 0.5) {
    patternType = "conservatism";
  } else {
    patternType = "internal_constraint";
  }

  await db.insert(behavioralPatternAggregates).values({
    patternType,
    regimeType,
    organizationCount: uniqueOrgs.size,
    observationCount: actions.length,
    avgLatencyToAction: avgLatency !== null ? Math.round(avgLatency) : null,
    followRate,
    overrideRate,
    ignoreRate,
    avgFdrAtObservation: avgFdr,
    avgConfidenceAtObservation: avgConfidence,
    periodStart,
    periodEnd,
  });

  console.log(`[BehavioralObservation] Pattern aggregated: ${patternType} for ${regimeType} (${uniqueOrgs.size} orgs, ${actions.length} observations)`);
}

// ============================================================================
// BOUNDED LEARNING QUERIES
// May use data to improve confidence scoring and identify execution risk patterns
// May NOT use data to redefine regimes, alter theory, or optimize for outcomes
// ============================================================================

/**
 * Query execution risk patterns for a regime type.
 * Purpose: distinguish model failures from organizational behavior failures.
 */
export async function queryExecutionRiskPatterns(regimeType: string): Promise<{
  overrideRate: number;
  avgLatencyMs: number;
  dominantPattern: PatternType;
  observationCount: number;
}> {
  const patterns = await db
    .select()
    .from(behavioralPatternAggregates)
    .where(eq(behavioralPatternAggregates.regimeType, regimeType))
    .orderBy(desc(behavioralPatternAggregates.createdAt))
    .limit(10);

  if (patterns.length === 0) {
    return {
      overrideRate: 0,
      avgLatencyMs: 0,
      dominantPattern: "conservatism",
      observationCount: 0,
    };
  }

  const totalObs = patterns.reduce((sum, p) => sum + p.observationCount, 0);
  const weightedOverride = patterns.reduce((sum, p) => sum + (p.overrideRate ?? 0) * p.observationCount, 0) / totalObs;
  const latencies = patterns.filter(p => p.avgLatencyToAction !== null).map(p => p.avgLatencyToAction!);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  // Find dominant pattern
  const patternCounts: Record<PatternType, number> = {
    "early_discipline": 0,
    "delayed_reaction": 0,
    "overconfidence": 0,
    "conservatism": 0,
    "internal_constraint": 0,
  };
  for (const p of patterns) {
    patternCounts[p.patternType as PatternType] += p.observationCount;
  }
  const dominantPattern = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as PatternType;

  return {
    overrideRate: weightedOverride,
    avgLatencyMs: avgLatency,
    dominantPattern,
    observationCount: totalObs,
  };
}

/**
 * Get confidence adjustment factor based on behavioral patterns.
 * This is bounded learning - adjusts confidence, does not redefine regimes.
 */
export async function getConfidenceAdjustmentFromBehavior(regimeType: string): Promise<number> {
  const patterns = await queryExecutionRiskPatterns(regimeType);
  
  if (patterns.observationCount < 50) {
    // Insufficient data for adjustment
    return 0;
  }

  // High override rate suggests execution discipline risk
  // This is a diagnostic signal, not a prescriptive adjustment
  if (patterns.overrideRate > 0.5) {
    return -0.1; // Minor confidence penalty for high override regimes
  }
  
  if (patterns.dominantPattern === "early_discipline" && patterns.overrideRate < 0.2) {
    return 0.05; // Minor confidence boost for disciplined execution
  }

  return 0;
}

// ============================================================================
// OBSERVATION HOOKS
// These are called from API endpoints to record observations
// ============================================================================

let currentRegimeSnapshotId: string | null = null;
let lastSnapshotTime = 0;
const SNAPSHOT_CACHE_MS = 60000; // Cache snapshot for 1 minute

/**
 * Get or create current regime snapshot.
 * Caches snapshot to avoid excessive database writes.
 */
export async function getCurrentRegimeSnapshotId(regimeState: RegimeState): Promise<string> {
  const now = Date.now();
  
  if (currentRegimeSnapshotId && (now - lastSnapshotTime) < SNAPSHOT_CACHE_MS) {
    return currentRegimeSnapshotId;
  }

  currentRegimeSnapshotId = await captureRegimeSnapshot(regimeState);
  lastSnapshotTime = now;
  return currentRegimeSnapshotId;
}

/**
 * Convenience function to record regime signal exposure in one call.
 */
export async function observeRegimeSignalExposure(
  companyId: string,
  regimeState: RegimeState,
  exposureType: ExposureType,
  signalCategory: SignalCategory,
  signalContent: any,
  sessionId?: string
): Promise<string> {
  const snapshotId = await getCurrentRegimeSnapshotId(regimeState);
  
  return await recordSignalExposure({
    companyId,
    regimeSnapshotId: snapshotId,
    exposureType,
    signalCategory,
    signalContent,
    sessionId,
  });
}

/**
 * Convenience function to record user action in one call.
 */
export async function observeUserAction(
  companyId: string,
  regimeState: RegimeState,
  actionType: ActionType,
  actionCategory: ActionCategory,
  actionDetails: any,
  signalExposureId?: string,
  latencyMs?: number
): Promise<string> {
  const snapshotId = await getCurrentRegimeSnapshotId(regimeState);
  
  return await recordUserAction({
    companyId,
    signalExposureId,
    regimeSnapshotId: snapshotId,
    actionType,
    actionCategory,
    latencyMs,
    actionDetails,
  });
}
