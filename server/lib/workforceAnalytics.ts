import { db } from "../db";
import { employees, employeePayroll, employeePtoBalances, employeePerformanceReviews, economicSnapshots, productionMetrics, companies } from "@shared/schema";
import { eq, desc, and, sql, gte, count } from "drizzle-orm";
import type { IStorage } from "../storage";
import { CANONICAL_REGIME_THRESHOLDS } from "./regimeConstants";

/**
 * Workforce Analytics Service
 * 
 * Generates workforce intelligence metrics including:
 * - Headcount trends and predictions
 * - Productivity per employee
 * - Regime-aware hiring recommendations
 * - Labor cost optimization
 */

interface WorkforceAnalyticsResult {
  totalEmployees: number;
  activeEmployees: number;
  productivityPerEmployee: number;
  laborCostPerUnit: number;
  regime: string;
  hiringSignal: string;
  recommendations: string[];
  departmentBreakdown: Record<string, number>;
}

export class WorkforceAnalyticsService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async generateWorkforceAnalytics(companyId: string): Promise<WorkforceAnalyticsResult> {
    console.log(`[Workforce] Generating workforce analytics for company ${companyId}`);

    const companyEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, companyId));

    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.createdAt))
      .limit(1);

    const currentRegime = latestSnapshot[0]?.regime || "HEALTHY_EXPANSION";
    const currentFdr = latestSnapshot[0]?.fdr || 1.0;

    if (companyEmployees.length === 0) {
      console.log("[Workforce] No employees found, returning recommendations only");
      const recommendations = this.getRegimeRecommendations(currentRegime, currentFdr, 0);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        productivityPerEmployee: 0,
        laborCostPerUnit: 0,
        regime: currentRegime,
        hiringSignal: this.getHiringSignal(currentRegime, currentFdr),
        recommendations,
        departmentBreakdown: {},
      };
    }

    const activeEmployees = companyEmployees.filter(e => e.status === "active").length;

    const departmentBreakdown: Record<string, number> = {};
    for (const emp of companyEmployees) {
      const dept = emp.department || "Unknown";
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
    }

    const recentMetrics = await db
      .select()
      .from(productionMetrics)
      .where(eq(productionMetrics.companyId, companyId))
      .orderBy(desc(productionMetrics.createdAt))
      .limit(10);

    const totalUnitsProduced = recentMetrics.reduce((sum, m) => sum + (m.totalUnitsProduced || 0), 0);
    const productivityPerEmployee = activeEmployees > 0 ? totalUnitsProduced / activeEmployees : 0;

    const payrollData = await db
      .select()
      .from(employeePayroll)
      .where(eq(employeePayroll.companyId, companyId));

    const totalLabor = payrollData.reduce((sum, p) => sum + (p.annualSalary || 0), 0);
    const laborCostPerUnit = totalUnitsProduced > 0 ? totalLabor / totalUnitsProduced : 0;

    const recommendations = this.getRegimeRecommendations(currentRegime, currentFdr, activeEmployees);
    const hiringSignal = this.getHiringSignal(currentRegime, currentFdr);

    console.log(`[Workforce] ${activeEmployees} active employees, signal: ${hiringSignal}`);

    return {
      totalEmployees: companyEmployees.length,
      activeEmployees,
      productivityPerEmployee: Math.round(productivityPerEmployee * 100) / 100,
      laborCostPerUnit: Math.round(laborCostPerUnit * 100) / 100,
      regime: currentRegime,
      hiringSignal,
      recommendations,
      departmentBreakdown,
    };
  }

  private getHiringSignal(regime: string, fdr: number): string {
    // REAL_ECONOMY_LEAD (FDR ≥ 2.5) = asset markets overheated, invest in real capacity
    if (regime === "REAL_ECONOMY_LEAD" && fdr >= CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min) return "HIRE_AGGRESSIVELY";
    if (regime === "HEALTHY_EXPANSION") return "HIRE_MODERATELY";
    if (regime === "ASSET_LED_GROWTH") return "MAINTAIN_CURRENT";
    if (regime === "IMBALANCED_EXCESS" || fdr >= CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min) return "FREEZE_HIRING";
    return "EVALUATE";
  }

  private getRegimeRecommendations(regime: string, fdr: number, employeeCount: number): string[] {
    const recommendations: string[] = [];

    switch (regime) {
      case "REAL_ECONOMY_LEAD":
        // REAL_ECONOMY_LEAD at high FDR (≥2.5) = asset markets overheated, invest in real capacity
        recommendations.push("OPPORTUNITY: Asset markets overheated - invest in real economy capacity");
        recommendations.push("Hire skilled workers now while competitors focus on financial assets");
        recommendations.push("Invest in training programs to build capabilities");
        if (fdr >= 2.8) {
          recommendations.push("Counter-cyclical hiring opportunity - asset-focused competitors reducing headcount");
        }
        break;
      case "HEALTHY_EXPANSION":
        recommendations.push("Balanced growth - expand workforce in line with production needs");
        recommendations.push("Focus on retention and employee development");
        recommendations.push("Consider automation investments to improve productivity");
        break;
      case "ASSET_LED_GROWTH":
        recommendations.push("CAUTION: Asset inflation may not translate to real production needs");
        recommendations.push("Maintain current workforce - avoid aggressive hiring");
        recommendations.push("Focus on productivity improvements over headcount growth");
        recommendations.push("Build flexible workforce capacity (contractors, temp workers)");
        break;
      case "IMBALANCED_EXCESS":
        recommendations.push("WARNING: Economic correction likely - freeze hiring immediately");
        recommendations.push("Review workforce for efficiency opportunities");
        recommendations.push("Build cash reserves - consider voluntary attrition");
        recommendations.push("Prepare contingency plans for potential downsizing");
        break;
    }

    if (employeeCount > 0) {
      recommendations.push(`Current headcount: ${employeeCount} employees`);
    }

    return recommendations;
  }

  async getWorkforceProjection(companyId: string, monthsAhead: number = 12): Promise<any> {
    const analytics = await this.generateWorkforceAnalytics(companyId);
    
    const growthRates: Record<string, number> = {
      "REAL_ECONOMY_LEAD": 0.10,
      "HEALTHY_EXPANSION": 0.05,
      "ASSET_LED_GROWTH": 0.02,
      "IMBALANCED_EXCESS": -0.05,
    };

    const monthlyGrowth = (growthRates[analytics.regime] || 0) / 12;
    
    const projections = [];
    let currentHeadcount = analytics.activeEmployees || 1;
    
    for (let month = 1; month <= monthsAhead; month++) {
      currentHeadcount = currentHeadcount * (1 + monthlyGrowth);
      projections.push({
        month,
        projectedHeadcount: Math.round(currentHeadcount),
        laborCost: Math.round(currentHeadcount * 5000),
        productivityTarget: Math.round(analytics.productivityPerEmployee * currentHeadcount),
      });
    }

    return {
      currentState: analytics,
      projections,
      assumptions: {
        regime: analytics.regime,
        monthlyGrowthRate: monthlyGrowth * 100,
        baseProductivity: analytics.productivityPerEmployee,
      },
    };
  }
}

export function createWorkforceAnalyticsService(storage: IStorage): WorkforceAnalyticsService {
  return new WorkforceAnalyticsService(storage);
}
