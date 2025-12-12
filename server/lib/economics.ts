import { regimeIntelligence, RegimeIntelligence } from "./regimeIntelligence";

export type Regime = "HEALTHY_EXPANSION" | "ASSET_LED_GROWTH" | "IMBALANCED_EXCESS" | "REAL_ECONOMY_LEAD";

export interface EconomicData {
  manufacturing_pmi: number;
  core_pce: number;
  ci_loans_growth: number;
  margin_debt_growth: number;
  asset_price_index: number;
  last_updated: string;
}

export interface PolicySignal {
  signal: string;
  intensity: number;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export interface RegimeChange {
  from: Regime;
  to: Regime;
  timestamp: string;
  fdr: number;
}

export class DualCircuitEconomics {
  data: EconomicData;
  fdr: number;
  regime: Regime;
  lastRegimeChange: RegimeChange | null;
  intelligence: RegimeIntelligence;

  constructor() {
    this.data = {
      manufacturing_pmi: 52.5,
      core_pce: 0.032,
      ci_loans_growth: 0.03,
      margin_debt_growth: 0.08,
      asset_price_index: 1.12,
      last_updated: new Date().toISOString(),
    };
    this.fdr = 1.0;
    this.regime = "HEALTHY_EXPANSION";
    this.lastRegimeChange = null;
    this.intelligence = regimeIntelligence;
  }

  async fetch(): Promise<EconomicData> {
    const previousRegime = this.regime;
    
    try {
      const response = await fetch('https://api.factoryofthefuture.ai/economic-indicators', {
        signal: AbortSignal.timeout(5000),
      });
      this.data = await response.json();
    } catch (error) {
      this.data = {
        manufacturing_pmi: 52.5,
        core_pce: 0.032,
        ci_loans_growth: 0.03,
        margin_debt_growth: 0.08,
        asset_price_index: 1.12,
        last_updated: new Date().toISOString(),
      };
    }
    this.computeFdr();
    this.detectRegime();
    
    // Record FDR snapshot for regime intelligence tracking
    this.intelligence.recordFDRSnapshot(
      this.fdr, 
      this.regime, 
      this.data.ci_loans_growth, 
      this.data.margin_debt_growth
    );
    
    // Return regime change information
    if (previousRegime !== this.regime) {
      console.log(`[Economics] Regime change detected: ${previousRegime} → ${this.regime} (FDR: ${this.fdr.toFixed(2)})`);
      this.lastRegimeChange = {
        from: previousRegime,
        to: this.regime,
        timestamp: new Date().toISOString(),
        fdr: this.fdr,
      };
    }
    
    return this.data;
  }

  /**
   * Get comprehensive regime intelligence summary
   * Includes: FDR trends, transition predictions, confidence scores, procurement signals
   */
  getRegimeIntelligence() {
    return this.intelligence.getIntelligenceSummary();
  }

  /**
   * Get current regime with core metrics
   * Returns regime, FDR, and intelligence data
   */
  getCurrentRegime() {
    const intelligence = this.intelligence.getIntelligenceSummary();
    return {
      regime: this.regime,
      fdr: this.fdr,
      policySignals: intelligence.procurementSignal,
      intelligence,
      lastUpdated: this.data.last_updated,
    };
  }

  /**
   * Get optimized regime factor for forecasting
   * Data-driven rather than static factors
   */
  getOptimizedRegimeFactor(): number {
    return this.intelligence.getOptimizedRegimeFactor(this.regime);
  }

  /**
   * Get procurement timing signal based on current regime and FDR trends
   */
  getProcurementSignal() {
    return this.intelligence.getProcurementTimingSignal();
  }

  /**
   * Update regime factor based on prediction accuracy feedback
   */
  recordPredictionAccuracy(predicted: number, actual: number): void {
    this.intelligence.updateRegimeFactorFromAccuracy(this.regime, predicted, actual);
  }
  
  getRegimeChange() {
    return this.lastRegimeChange;
  }
  
  clearRegimeChange() {
    this.lastRegimeChange = null;
  }

  private computeFdr(): void {
    const assetGrowth = this.data.margin_debt_growth || 0.06;
    const assetIndex = this.data.asset_price_index || 1.08;
    const ciGrowth = this.data.ci_loans_growth || 0.02;
    const corePce = this.data.core_pce || 0.03;
    const denom = ciGrowth * corePce > 0 ? ciGrowth * corePce : 0.0001;
    this.fdr = clamp((assetGrowth * assetIndex) / denom, 0.2, 5.0);
  }

  private detectRegime(): void {
    if (this.fdr > 2.0) {
      this.regime = "IMBALANCED_EXCESS";
    } else if (this.fdr > 1.5) {
      this.regime = "ASSET_LED_GROWTH";
    } else if (this.fdr < 0.8) {
      this.regime = "REAL_ECONOMY_LEAD";
    } else {
      this.regime = "HEALTHY_EXPANSION";
    }
  }

  signals(): PolicySignal[] {
    const signals: PolicySignal[] = [];
    
    if (this.regime === "IMBALANCED_EXCESS") {
      signals.push(
        { signal: "REDUCE_INVENTORY", intensity: 0.8 },
        { signal: "TIGHTEN_CREDIT_TERMS", intensity: 0.7 },
        { signal: "DEFER_EXPANSION_CAPEX", intensity: 0.9 },
        { signal: "REFINANCE_LONG_FIXED", intensity: 0.9 }
      );
    } else if (this.regime === "ASSET_LED_GROWTH") {
      signals.push(
        { signal: "SLOW_INVENTORY_BUILD", intensity: 0.6 },
        { signal: "EXTEND_PAYABLES", intensity: 0.6 },
        { signal: "LOCK_RATES", intensity: 0.7 }
      );
    } else if (this.regime === "REAL_ECONOMY_LEAD") {
      signals.push(
        { signal: "COUNTER_CYCLICAL_BUY", intensity: 0.9 },
        { signal: "EXPAND_CAPACITY_SELECTIVE", intensity: 0.7 },
        { signal: "SUPPLY_CHAIN_FINANCE", intensity: 0.8 }
      );
    } else {
      signals.push(
        { signal: "OPTIMIZE_TURNOVER", intensity: 0.5 },
        { signal: "SELECTIVE_CAPEX", intensity: 0.5 }
      );
    }
    
    return signals;
  }
}
