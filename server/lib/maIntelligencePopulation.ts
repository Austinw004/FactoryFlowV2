import { db } from "../db";
import { maTargets, maRecommendations, economicSnapshots } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { IStorage } from "../storage";

/**
 * M&A Intelligence Population Service
 * 
 * Generates M&A targets and recommendations based on economic regime
 */

interface MAIntelligenceResult {
  targetsCreated: number;
  recommendationsGenerated: number;
  regime: string;
  timingSignal: string;
  strategicActions: string[];
}

const ACQUISITION_TARGETS = [
  { name: "TechMfg Solutions", industry: "Electronics", revenue: 15000000, employees: 120, strategicFit: 85 },
  { name: "PrecisionParts Co", industry: "Automotive", revenue: 8500000, employees: 65, strategicFit: 78 },
  { name: "Advanced Materials Inc", industry: "Aerospace", revenue: 22000000, employees: 180, strategicFit: 92 },
  { name: "SmartAssembly LLC", industry: "Industrial", revenue: 5500000, employees: 40, strategicFit: 72 },
  { name: "QualityMetrics Corp", industry: "Medical", revenue: 12000000, employees: 95, strategicFit: 88 },
];

const DIVESTITURE_TARGETS = [
  { name: "Legacy Systems Div", reason: "Non-core", estimatedValue: 3500000, strategicFit: 25 },
  { name: "Regional Distribution", reason: "Underperforming", estimatedValue: 1800000, strategicFit: 35 },
];

export class MAIntelligencePopulationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async generateMAIntelligence(companyId: string): Promise<MAIntelligenceResult> {
    console.log(`[M&A] Generating M&A intelligence for company ${companyId}`);

    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.createdAt))
      .limit(1);

    const currentRegime = latestSnapshot[0]?.regime || "HEALTHY_EXPANSION";
    const currentFdr = latestSnapshot[0]?.fdr || 1.0;

    const timingSignal = this.getRegimeTimingSignal(currentRegime, currentFdr);
    const strategicActions = this.getStrategicActions(currentRegime, currentFdr);

    let targetsCreated = 0;
    let recommendationsGenerated = 0;

    if (timingSignal === "BUY" || timingSignal === "OPPORTUNISTIC") {
      for (const target of ACQUISITION_TARGETS) {
        const fdrAdjustedValue = this.calculateFDRAdjustedValue(target.revenue * 2.5, currentFdr, currentRegime);
        const timingScore = this.calculateTimingScore(currentFdr, currentRegime, target.strategicFit);
        
        try {
          await db.insert(maTargets).values({
            companyId,
            targetName: target.name,
            targetIndustry: target.industry,
            targetType: "acquisition",
            estimatedValue: fdrAdjustedValue,
            strategicFitScore: target.strategicFit,
            synergyPotential: target.revenue * 0.1,
            integrationComplexity: "medium",
            currentFDR: currentFdr,
            currentRegime: currentRegime,
            targetRevenue: target.revenue,
            targetEmployees: target.employees,
          });
          targetsCreated++;
        } catch (error) {}
      }
    }

    if (timingSignal === "SELL" || currentRegime === "IMBALANCED_EXCESS") {
      for (const target of DIVESTITURE_TARGETS) {
        const timingScore = this.calculateDivestitureTimingScore(currentFdr, currentRegime);
        
        try {
          await db.insert(maTargets).values({
            companyId,
            targetName: target.name,
            targetType: "divestiture",
            estimatedValue: target.estimatedValue,
            strategicFitScore: target.strategicFit,
            integrationComplexity: "low",
            currentFDR: currentFdr,
            currentRegime: currentRegime,
          });
          targetsCreated++;
        } catch (error) {}
      }
    }

    for (const action of strategicActions) {
      try {
        await db.insert(maRecommendations).values({
          companyId,
          recommendationType: this.getRecommendationType(action),
          title: action.substring(0, 50),
          summary: action,
          detailedRationale: this.getRationale(action, currentRegime),
          currentFDR: currentFdr,
          currentRegime: currentRegime,
        });
        recommendationsGenerated++;
      } catch (error) {}
    }

    console.log(`[M&A] Created ${targetsCreated} targets, ${recommendationsGenerated} recommendations`);

    return {
      targetsCreated,
      recommendationsGenerated,
      regime: currentRegime,
      timingSignal,
      strategicActions,
    };
  }

  private getRegimeTimingSignal(regime: string, fdr: number): string {
    if (regime === "REAL_ECONOMY_LEAD" || fdr < 0.9) return "BUY";
    if (regime === "HEALTHY_EXPANSION") return "OPPORTUNISTIC";
    if (regime === "ASSET_LED_GROWTH") return "CAUTIOUS";
    if (regime === "IMBALANCED_EXCESS" || fdr > 1.3) return "SELL";
    return "HOLD";
  }

  private getStrategicActions(regime: string, fdr: number): string[] {
    const actions: string[] = [];
    
    switch (regime) {
      case "REAL_ECONOMY_LEAD":
        actions.push("Acquire distressed competitors at favorable valuations");
        actions.push("Lock in strategic acquisitions before regime shift");
        actions.push("Build cash reserves for opportunistic deals");
        break;
      case "HEALTHY_EXPANSION":
        actions.push("Pursue strategic bolt-on acquisitions");
        actions.push("Evaluate vertical integration opportunities");
        actions.push("Consider international expansion targets");
        break;
      case "ASSET_LED_GROWTH":
        actions.push("Defer non-critical acquisitions - valuations elevated");
        actions.push("Focus on operational improvements over M&A");
        actions.push("Review portfolio for divestiture candidates");
        break;
      case "IMBALANCED_EXCESS":
        actions.push("URGENT: Divest non-core assets at peak valuations");
        actions.push("Preserve cash for post-correction acquisitions");
        actions.push("Identify distressed acquisition targets for later");
        break;
    }

    if (fdr < 0.8) {
      actions.push("Counter-cyclical opportunity: Aggressive acquisition stance warranted");
    }
    if (fdr > 1.2) {
      actions.push("Caution: Elevated FDR suggests overvalued assets - delay acquisitions");
    }

    return actions;
  }

  private calculateFDRAdjustedValue(baseValue: number, fdr: number, regime: string): number {
    const multiplier = this.getFDRMultiplier(fdr, regime);
    return Math.round(baseValue * multiplier);
  }

  private getFDRMultiplier(fdr: number, regime: string): number {
    if (fdr < 0.85) return 0.75;
    if (fdr < 0.95) return 0.85;
    if (fdr >= 0.95 && fdr <= 1.05) return 1.0;
    if (fdr <= 1.15) return 1.15;
    if (fdr <= 1.25) return 1.25;
    return 1.4;
  }

  private calculateTimingScore(fdr: number, regime: string, strategicFit: number): number {
    let regimeBonus = 0;
    if (regime === "REAL_ECONOMY_LEAD") regimeBonus = 25;
    else if (regime === "HEALTHY_EXPANSION") regimeBonus = 15;
    else if (regime === "ASSET_LED_GROWTH") regimeBonus = -10;
    else if (regime === "IMBALANCED_EXCESS") regimeBonus = -25;
    
    const fdrBonus = fdr < 1.0 ? (1.0 - fdr) * 30 : -(fdr - 1.0) * 20;
    
    return Math.min(100, Math.max(0, strategicFit * 0.6 + 40 + regimeBonus + fdrBonus));
  }

  private calculateDivestitureTimingScore(fdr: number, regime: string): number {
    if (regime === "IMBALANCED_EXCESS") return 95;
    if (regime === "ASSET_LED_GROWTH") return 80;
    if (regime === "HEALTHY_EXPANSION") return 60;
    return 40;
  }

  private generateSynergies(industry: string): string[] {
    const synergies: string[] = [
      "Shared manufacturing capabilities",
      "Combined supplier network leverage",
      "Cross-selling opportunities",
    ];
    
    if (industry === "Electronics") synergies.push("Technology transfer");
    if (industry === "Automotive") synergies.push("Production capacity consolidation");
    if (industry === "Aerospace") synergies.push("Certification and compliance sharing");
    
    return synergies;
  }

  private generateRisks(regime: string): string[] {
    const risks: string[] = ["Integration complexity", "Cultural alignment"];
    
    if (regime === "IMBALANCED_EXCESS") {
      risks.push("Overpayment risk in inflated market");
      risks.push("Post-acquisition value destruction");
    }
    if (regime === "REAL_ECONOMY_LEAD") {
      risks.push("Target operational challenges");
    }
    
    return risks;
  }

  private getRecommendationType(action: string): string {
    if (action.includes("Acquire") || action.includes("acquisition")) return "acquisition";
    if (action.includes("Divest")) return "divestiture";
    if (action.includes("cash") || action.includes("reserves")) return "capital_allocation";
    return "strategic_initiative";
  }

  private getRationale(action: string, regime: string): string {
    return `Based on ${regime} regime analysis: ${action.substring(0, 100)}...`;
  }

  private getPriority(action: string): string {
    if (action.includes("URGENT") || action.includes("Counter-cyclical")) return "critical";
    if (action.includes("Acquire") || action.includes("Divest")) return "high";
    return "medium";
  }
}

export function createMAIntelligenceService(storage: IStorage): MAIntelligencePopulationService {
  return new MAIntelligencePopulationService(storage);
}
