export type WinType =
  | "cost_reduction"
  | "service_improvement"
  | "stockout_reduction"
  | "compound"
  | "no_win";

export interface DecisionOutcomeInput {
  baseline: {
    cost: number;
    serviceLevel: number;
    stockoutRate: number;
  };
  actual: {
    cost: number;
    serviceLevel: number;
    stockoutRate: number;
  };
}

export interface DecisionOutcome {
  win: boolean;
  winType: WinType;
  deltaCost: number;
  deltaServiceLevel: number;
  deltaStockout: number;
}

function assertFinite01(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`INVALID_OUTCOME_FIELD: ${field} is non-finite (${value})`);
  }
}

function assertRate(value: number, field: string): void {
  assertFinite01(value, field);
  if (value < 0 || value > 1) {
    throw new Error(`INVALID_OUTCOME_FIELD: ${field} must be in [0,1] (got ${value})`);
  }
}

export function evaluateDecisionOutcome(input: DecisionOutcomeInput): DecisionOutcome {
  const { baseline, actual } = input;

  assertFinite01(baseline.cost,        "baseline.cost");
  assertRate(baseline.serviceLevel,    "baseline.serviceLevel");
  assertRate(baseline.stockoutRate,    "baseline.stockoutRate");
  assertFinite01(actual.cost,          "actual.cost");
  assertRate(actual.serviceLevel,      "actual.serviceLevel");
  assertRate(actual.stockoutRate,      "actual.stockoutRate");

  const deltaCost         = actual.cost         - baseline.cost;
  const deltaServiceLevel = actual.serviceLevel  - baseline.serviceLevel;
  const deltaStockout     = actual.stockoutRate  - baseline.stockoutRate;

  const costWin     = deltaCost         < 0;
  const serviceWin  = deltaServiceLevel > 0;
  const stockoutWin = deltaStockout     < 0;

  const winCount = (costWin ? 1 : 0) + (serviceWin ? 1 : 0) + (stockoutWin ? 1 : 0);
  const win = winCount > 0;

  let winType: WinType;
  if (winCount >= 2) {
    winType = "compound";
  } else if (costWin) {
    winType = "cost_reduction";
  } else if (serviceWin) {
    winType = "service_improvement";
  } else if (stockoutWin) {
    winType = "stockout_reduction";
  } else {
    winType = "no_win";
  }

  return { win, winType, deltaCost, deltaServiceLevel, deltaStockout };
}
