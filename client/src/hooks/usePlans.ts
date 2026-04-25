/**
 * usePlans — single source of truth for marketing/billing pricing display.
 *
 * Fetches `/api/billing/plans` (a thin wrapper over server/lib/billingService.ts
 * BILLING_PLANS), and reshapes the flat plan list into the grouped form the
 * UI needs ({ starter: {monthly, annual}, growth: {...}, usageBased, performance }).
 *
 * Why this exists: the same prices used to be hardcoded in three places —
 * Pricing.tsx, Billing.tsx, and LandingPage.tsx. If a price changed in Stripe
 * but not in one of those files (or vice versa), the user saw mismatched
 * numbers between marketing and checkout. Now there is one source of truth
 * (server/lib/billingService.ts BILLING_PLANS), surfaced here, and consumed
 * in all three places.
 *
 * Defensive fallback: if the API call fails or hasn't loaded yet, we return
 * the current production prices so the page never breaks. The fallback is
 * intentionally identical to BILLING_PLANS — keep them in sync if either side
 * changes.
 */

import { useQuery } from "@tanstack/react-query";

// ──────────────────────────────────────────────────────────────────────────────
// Server response shape (matches getPlans() in server/lib/billingService.ts)
// ──────────────────────────────────────────────────────────────────────────────

interface RawPlan {
  id: string;
  name: string;
  description: string;
  priceCents?: number;
  baseFeeCents?: number;
  baseSkus?: number;
  overageRate?: string;
  monthlyCapCents?: number;
  feePercentageMin?: number;
  feePercentageMax?: number;
  feePercentageDefault?: number;
  currency: string;
  interval: "month" | "year";
  intervalCount?: number;
  type: "subscription" | "usage" | "performance";
  disclaimer?: string;
  cta?: readonly string[] | string[];
}

interface PlansApiResponse {
  plans: RawPlan[];
}

// ──────────────────────────────────────────────────────────────────────────────
// UI shape — what pages actually want to render
// ──────────────────────────────────────────────────────────────────────────────

export interface PlanGroup {
  /** Dollars (priceCents / 100). Matches what the UI displays. */
  monthly: number | null;
  annual: number | null;
}

export interface UsageBasedPlan {
  monthlyBase: number;
  baseSkus: number;
  overagePerSku: number;
  monthlyCap: number;
}

export interface PerformancePlan {
  monthlyBase: number;
  feePercentageMin: number; // 0.10
  feePercentageMax: number; // 0.20
  feePercentageDefault: number; // 0.15
}

export interface NormalizedPlans {
  starter: PlanGroup;
  growth: PlanGroup;
  usageBased: UsageBasedPlan;
  performance: PerformancePlan;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fallback values — must mirror server/lib/billingService.ts BILLING_PLANS.
// Used while the query is loading and if it fails. Keep in sync with the server.
// ──────────────────────────────────────────────────────────────────────────────

export const FALLBACK_PLANS: NormalizedPlans = {
  starter:    { monthly: 299, annual: 2990 },
  growth:     { monthly: 799, annual: 7990 },
  usageBased: {
    monthlyBase: 199,
    baseSkus:    100,
    overagePerSku: 2,
    monthlyCap:  799,
  },
  performance: {
    monthlyBase:          100,
    feePercentageMin:     0.10,
    feePercentageMax:     0.20,
    feePercentageDefault: 0.15,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Reshape helper: flat server list → grouped UI shape
// ──────────────────────────────────────────────────────────────────────────────

function normalize(raw: RawPlan[] | undefined): NormalizedPlans {
  if (!raw || raw.length === 0) return FALLBACK_PLANS;

  const byId = Object.fromEntries(raw.map((p) => [p.id, p]));
  const dollars = (cents?: number) =>
    typeof cents === "number" ? Math.round(cents / 100) : null;

  // Each lookup falls back individually so a partially-loaded response
  // still produces a coherent UI.
  return {
    starter: {
      monthly: dollars(byId.monthly_starter?.priceCents) ?? FALLBACK_PLANS.starter.monthly,
      annual:  dollars(byId.annual_starter?.priceCents)  ?? FALLBACK_PLANS.starter.annual,
    },
    growth: {
      monthly: dollars(byId.monthly_growth?.priceCents) ?? FALLBACK_PLANS.growth.monthly,
      annual:  dollars(byId.annual_growth?.priceCents)  ?? FALLBACK_PLANS.growth.annual,
    },
    usageBased: {
      monthlyBase:   dollars(byId.usage_based?.baseFeeCents)    ?? FALLBACK_PLANS.usageBased.monthlyBase,
      baseSkus:      byId.usage_based?.baseSkus                 ?? FALLBACK_PLANS.usageBased.baseSkus,
      overagePerSku: parseFloat(byId.usage_based?.overageRate ?? "") || FALLBACK_PLANS.usageBased.overagePerSku,
      monthlyCap:    dollars(byId.usage_based?.monthlyCapCents) ?? FALLBACK_PLANS.usageBased.monthlyCap,
    },
    performance: {
      monthlyBase:          dollars(byId.performance?.baseFeeCents)         ?? FALLBACK_PLANS.performance.monthlyBase,
      feePercentageMin:     byId.performance?.feePercentageMin              ?? FALLBACK_PLANS.performance.feePercentageMin,
      feePercentageMax:     byId.performance?.feePercentageMax              ?? FALLBACK_PLANS.performance.feePercentageMax,
      feePercentageDefault: byId.performance?.feePercentageDefault          ?? FALLBACK_PLANS.performance.feePercentageDefault,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export function usePlans(): NormalizedPlans & { isLoading: boolean } {
  const { data, isLoading } = useQuery<PlansApiResponse>({
    queryKey: ["/api/billing/plans"],
    // Plans rarely change. Cache aggressively so the marketing page doesn't
    // re-fetch every navigation.
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime:    30 * 60 * 1000, // 30 min
    retry: 1,
  });

  const normalized = normalize(data?.plans);
  return { ...normalized, isLoading };
}

// ──────────────────────────────────────────────────────────────────────────────
// Display helpers
// ──────────────────────────────────────────────────────────────────────────────

export function formatPrice(dollars: number | null): string {
  if (dollars === null) return "Custom";
  return `$${dollars.toLocaleString("en-US")}`;
}

/** Convenience: annual savings vs paying monthly for 12 months. */
export function annualSavings(plan: PlanGroup): number {
  if (plan.monthly === null || plan.annual === null) return 0;
  return plan.monthly * 12 - plan.annual;
}

/** Convenience: annual price expressed as monthly billed-annually. */
export function annualAsMonthly(plan: PlanGroup): number {
  if (plan.annual === null) return 0;
  return Math.round(plan.annual / 12);
}
