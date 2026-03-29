import { db } from "../db";
import { sql, eq, and, desc } from "drizzle-orm";
import {
  decisionOutcomes,
  winRateSnapshots,
  type DecisionOutcomeRow,
} from "@shared/schema";
import {
  evaluateDecisionOutcome,
  type DecisionOutcomeInput,
  type DecisionOutcome,
} from "./decisionOutcome";
import { randomUUID } from "crypto";

export type SkuSegment = "fast_mover" | "slow_mover" | "intermittent" | "no_data";

// ─── Input / output types ────────────────────────────────────────────────────

export interface RecordDecisionInput {
  companyId: string;
  decisionId?: string;
  skuId?: string;
  regime?: string;
  segment?: SkuSegment;
  baselineDecision: Record<string, unknown>;
  systemDecision: Record<string, unknown>;
  outcomeInput: DecisionOutcomeInput;
}

export interface WinRateMetrics {
  globalWinRate: number;
  totalDecisions: number;
  totalWins: number;
  winRateBySku: Record<string, number>;
  winRateBySegment: Record<string, number>;
  winRateByRegime: Record<string, number>;
  performanceFlag: string | null;
  automationBlocked: boolean;
  trustScoreMultiplier: number;
}

// ─── Core: persist a single decision outcome ─────────────────────────────────

export async function recordDecisionOutcome(
  input: RecordDecisionInput,
): Promise<DecisionOutcome & { id: string }> {
  const outcome = evaluateDecisionOutcome(input.outcomeInput);
  const decisionId = input.decisionId ?? randomUUID();

  const [row] = await db
    .insert(decisionOutcomes)
    .values({
      companyId: input.companyId,
      decisionId,
      skuId: input.skuId ?? null,
      regime: input.regime ?? null,
      segment: input.segment ?? null,
      baselineDecision: input.baselineDecision,
      systemDecision: input.systemDecision,
      actualOutcome: input.outcomeInput.actual as any,
      win: outcome.win,
      winType: outcome.winType,
      deltaCost: isFinite(outcome.deltaCost) ? outcome.deltaCost : null,
      deltaServiceLevel: isFinite(outcome.deltaServiceLevel)
        ? outcome.deltaServiceLevel
        : null,
      deltaStockout: isFinite(outcome.deltaStockout) ? outcome.deltaStockout : null,
    })
    .returning();

  return { ...outcome, id: row.id };
}

// ─── Metrics: compute win-rate metrics from DB ───────────────────────────────

export async function computeWinRateMetrics(
  companyId: string,
): Promise<WinRateMetrics> {
  const rows = await db
    .select()
    .from(decisionOutcomes)
    .where(eq(decisionOutcomes.companyId, companyId))
    .orderBy(desc(decisionOutcomes.createdAt));

  const totalDecisions = rows.length;
  const totalWins = rows.filter((r) => r.win).length;
  const globalWinRate = totalDecisions > 0 ? totalWins / totalDecisions : 0;

  type Acc = Record<string, { wins: number; total: number }>;
  const bySku: Acc = {};
  const bySegment: Acc = {};
  const byRegime: Acc = {};

  for (const row of rows) {
    if (row.skuId) {
      bySku[row.skuId] ??= { wins: 0, total: 0 };
      bySku[row.skuId].total++;
      if (row.win) bySku[row.skuId].wins++;
    }
    if (row.segment) {
      bySegment[row.segment] ??= { wins: 0, total: 0 };
      bySegment[row.segment].total++;
      if (row.win) bySegment[row.segment].wins++;
    }
    if (row.regime) {
      byRegime[row.regime] ??= { wins: 0, total: 0 };
      byRegime[row.regime].total++;
      if (row.win) byRegime[row.regime].wins++;
    }
  }

  const toRate = (m: Acc): Record<string, number> =>
    Object.fromEntries(
      Object.entries(m).map(([k, v]) => [k, v.total > 0 ? v.wins / v.total : 0]),
    );

  const guardrails = getPerformanceGuardrails(globalWinRate);

  return {
    globalWinRate,
    totalDecisions,
    totalWins,
    winRateBySku: toRate(bySku),
    winRateBySegment: toRate(bySegment),
    winRateByRegime: toRate(byRegime),
    ...guardrails,
  };
}

// ─── Guardrails: win-rate thresholds ─────────────────────────────────────────

export function getPerformanceGuardrails(winRate: number): {
  performanceFlag: string | null;
  automationBlocked: boolean;
  trustScoreMultiplier: number;
} {
  if (!isFinite(winRate) || winRate < 0) {
    return { performanceFlag: null, automationBlocked: false, trustScoreMultiplier: 1.0 };
  }
  if (winRate < 0.3) {
    console.warn(
      `[DecisionEvaluation:AUDIT] WIN_RATE=${(winRate * 100).toFixed(1)}% < 30% — ` +
        "UNDERPERFORMING_SYSTEM: automation BLOCKED, trust reduced 30%",
    );
    return {
      performanceFlag: "UNDERPERFORMING_SYSTEM",
      automationBlocked: true,
      trustScoreMultiplier: 0.7,
    };
  }
  if (winRate < 0.4) {
    console.warn(
      `[DecisionEvaluation:AUDIT] WIN_RATE=${(winRate * 100).toFixed(1)}% < 40% — ` +
        "UNDERPERFORMING_SYSTEM: trust reduced 30%",
    );
    return {
      performanceFlag: "UNDERPERFORMING_SYSTEM",
      automationBlocked: false,
      trustScoreMultiplier: 0.7,
    };
  }
  if (winRate < 0.5) {
    console.warn(
      `[DecisionEvaluation:AUDIT] WIN_RATE=${(winRate * 100).toFixed(1)}% < 50% — ` +
        "UNDERPERFORMING_SYSTEM flagged",
    );
    return {
      performanceFlag: "UNDERPERFORMING_SYSTEM",
      automationBlocked: false,
      trustScoreMultiplier: 1.0,
    };
  }
  return { performanceFlag: null, automationBlocked: false, trustScoreMultiplier: 1.0 };
}

// ─── Trust integration ────────────────────────────────────────────────────────

export function applyWinRateToTrust(trustScore: number, winRate: number): number {
  const { trustScoreMultiplier } = getPerformanceGuardrails(winRate);
  const adjusted = Math.max(0, trustScore * trustScoreMultiplier);
  if (trustScoreMultiplier < 1.0) {
    console.warn(
      `[DecisionEvaluation:AUDIT] trustScore adjusted: ${trustScore.toFixed(3)} → ` +
        `${adjusted.toFixed(3)} (multiplier=${trustScoreMultiplier} winRate=${(winRate * 100).toFixed(1)}%)`,
    );
  }
  return adjusted;
}

// ─── Recent outcomes for copilot ─────────────────────────────────────────────

export async function getRecentOutcomes(
  companyId: string,
  limit: number = 5,
): Promise<DecisionOutcomeRow[]> {
  return db
    .select()
    .from(decisionOutcomes)
    .where(eq(decisionOutcomes.companyId, companyId))
    .orderBy(desc(decisionOutcomes.createdAt))
    .limit(limit);
}

// ─── Confidence trend: compare last-15 vs prior-15 days ──────────────────────

export async function getConfidenceTrend(
  companyId: string,
): Promise<"improving" | "degrading" | "stable"> {
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cutoff15 = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  const all = await db
    .select()
    .from(decisionOutcomes)
    .where(
      and(
        eq(decisionOutcomes.companyId, companyId),
        sql`${decisionOutcomes.createdAt} >= ${cutoff30.toISOString()}`,
      ),
    )
    .orderBy(desc(decisionOutcomes.createdAt));

  const recent = all.filter((r) => r.createdAt && new Date(r.createdAt) >= cutoff15);
  const prior = all.filter((r) => r.createdAt && new Date(r.createdAt) < cutoff15);

  if (recent.length === 0 || prior.length === 0) return "stable";

  const recentRate = recent.filter((r) => r.win).length / recent.length;
  const priorRate = prior.filter((r) => r.win).length / prior.length;
  const delta = recentRate - priorRate;

  if (delta > 0.05) return "improving";
  if (delta < -0.05) return "degrading";
  return "stable";
}

// ─── Daily snapshot persistence ───────────────────────────────────────────────

export async function persistDailySnapshot(companyId: string): Promise<void> {
  const metrics = await computeWinRateMetrics(companyId);
  const snapshotDate = new Date().toISOString().slice(0, 10);

  await db
    .insert(winRateSnapshots)
    .values({
      companyId,
      snapshotDate,
      globalWinRate: metrics.globalWinRate,
      totalDecisions: metrics.totalDecisions,
      totalWins: metrics.totalWins,
      winRateBySku: metrics.winRateBySku as any,
      winRateBySegment: metrics.winRateBySegment as any,
      winRateByRegime: metrics.winRateByRegime as any,
      performanceFlag: metrics.performanceFlag ?? null,
    })
    .onConflictDoUpdate({
      target: [winRateSnapshots.companyId, winRateSnapshots.snapshotDate],
      set: {
        globalWinRate: metrics.globalWinRate,
        totalDecisions: metrics.totalDecisions,
        totalWins: metrics.totalWins,
        winRateBySku: metrics.winRateBySku as any,
        winRateBySegment: metrics.winRateBySegment as any,
        winRateByRegime: metrics.winRateByRegime as any,
        performanceFlag: metrics.performanceFlag ?? null,
      },
    });

  console.log(
    `[DecisionEvaluation] Daily snapshot persisted companyId=${companyId} ` +
      `date=${snapshotDate} globalWinRate=${(metrics.globalWinRate * 100).toFixed(1)}% ` +
      `decisions=${metrics.totalDecisions} wins=${metrics.totalWins}`,
  );
}
