import type { SupplierNode, SupplierHealthMetrics } from "@shared/schema";

export interface RiskScoreInputs {
  financialHealthScore?: number | null;
  bankruptcyRisk?: number | null;
  onTimeDeliveryRate?: number | null;
  qualityScore?: number | null;
  capacityUtilization?: number | null;
  currentFDR?: number | null;
  tier: number;
  criticality: string;
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100, higher = more risky
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: {
    financial: number;
    operational: number;
    economic: number;
    structural: number;
  };
  recommendations: string[];
}

export interface CascadingImpactAnalysis {
  directImpact: number; // 0-100
  downstreamRisk: number; // 0-100
  affectedMaterialCount: number;
  affectedSkuCount: number;
  estimatedFinancialImpact: number; // in dollars
}

/**
 * Calculate comprehensive risk score for a supplier node
 * Integrates financial health, operational performance, economic exposure, and supply chain position
 */
export function calculateSupplierRiskScore(inputs: RiskScoreInputs): RiskAssessment {
  // 1. Financial Risk (0-100, higher = more risky)
  const financialHealth = inputs.financialHealthScore ?? 50;
  const bankruptcyProb = inputs.bankruptcyRisk ?? 0;
  const financialRisk = ((100 - financialHealth) * 0.6) + (bankruptcyProb * 0.4);

  // 2. Operational Risk (0-100, higher = more risky)
  const deliveryRate = inputs.onTimeDeliveryRate ?? 95;
  const quality = inputs.qualityScore ?? 85;
  const capacity = inputs.capacityUtilization ?? 70;
  
  // High capacity utilization (>90%) is risky, low (<50%) also risky
  const capacityRisk = capacity > 90 ? ((capacity - 90) * 5) : (capacity < 50 ? (50 - capacity) * 1.5 : 0);
  const operationalRisk = ((100 - deliveryRate) * 1.2) + ((100 - quality) * 0.8) + (capacityRisk * 0.3);

  // 3. Economic Exposure Risk (FDR-based)
  let economicRisk = 30; // default moderate risk
  if (inputs.currentFDR !== null && inputs.currentFDR !== undefined) {
    // High FDR (>1.3) = Asset-led bubble = higher supplier bankruptcy risk
    // Low FDR (<0.8) = Real economy drag = operational slowdown risk
    if (inputs.currentFDR > 1.3) {
      economicRisk = 40 + ((inputs.currentFDR - 1.3) * 50); // Escalates quickly
    } else if (inputs.currentFDR < 0.8) {
      economicRisk = 30 + ((0.8 - inputs.currentFDR) * 30);
    } else {
      economicRisk = 20; // Healthy expansion regime = lower risk
    }
  }

  // 4. Structural Risk (position in supply chain)
  let structuralRisk = 0;
  // Tier 1 (direct) suppliers are lower risk structurally
  // Tier 2+ have compounding risks
  structuralRisk += (inputs.tier - 1) * 15;
  
  // Criticality multiplier
  const criticalityMultiplier = {
    'low': 0.7,
    'medium': 1.0,
    'high': 1.3,
    'critical': 1.6
  }[inputs.criticality] || 1.0;

  // Overall risk score (weighted average)
  const baseRisk = (
    financialRisk * 0.35 +
    operationalRisk * 0.25 +
    economicRisk * 0.25 +
    structuralRisk * 0.15
  );

  const overallRiskScore = Math.min(100, Math.max(0, baseRisk * criticalityMultiplier));

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (overallRiskScore < 25) riskLevel = 'low';
  else if (overallRiskScore < 50) riskLevel = 'medium';
  else if (overallRiskScore < 75) riskLevel = 'high';
  else riskLevel = 'critical';

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (financialRisk > 60) {
    recommendations.push('Monitor financial health closely - consider requiring financial guarantees');
  }
  if (bankruptcyProb > 50) {
    recommendations.push('URGENT: High bankruptcy risk - identify alternative suppliers immediately');
  }
  if (deliveryRate < 85) {
    recommendations.push('Address delivery performance - negotiate SLAs or diversify suppliers');
  }
  if (quality < 75) {
    recommendations.push('Quality concerns - implement enhanced inspection protocols');
  }
  if (capacity > 95) {
    recommendations.push('Supplier at max capacity - risk of delivery delays, consider backup options');
  }
  if (inputs.currentFDR && inputs.currentFDR > 1.3) {
    recommendations.push('Asset-led regime detected - prepare for potential supplier consolidation/failures');
  }
  if (inputs.tier > 2) {
    recommendations.push('Multi-tier dependency - map full supply chain to identify vulnerabilities');
  }
  if (inputs.criticality === 'critical' && overallRiskScore > 40) {
    recommendations.push('CRITICAL SUPPLIER AT RISK - activate contingency plan and secure alternatives');
  }

  return {
    overallRiskScore,
    riskLevel,
    riskFactors: {
      financial: financialRisk,
      operational: operationalRisk,
      economic: economicRisk,
      structural: structuralRisk
    },
    recommendations
  };
}

/**
 * Calculate FDR-aware risk multiplier for current economic regime
 * Used to adjust procurement timing and inventory buffers
 */
export function getFDRRiskMultiplier(fdr: number, regime: string): number {
  // Healthy Expansion (FDR 0.95-1.05): Normal risk
  if (fdr >= 0.95 && fdr <= 1.05) return 1.0;
  
  // Asset-Led Growth (FDR >1.05): Escalating supplier bankruptcy risk
  if (fdr > 1.05) {
    const excessFDR = fdr - 1.05;
    return 1.0 + (excessFDR * 2); // Risk increases exponentially
  }
  
  // Real Economy Lead (FDR <0.95): Demand slowdown risk
  if (fdr < 0.95) {
    const deficitFDR = 0.95 - fdr;
    return 1.0 + (deficitFDR * 1.2); // Moderate risk increase
  }
  
  return 1.0;
}

/**
 * Analyze cascading impact if a supplier node fails
 * Estimates downstream effects on materials, SKUs, and financials
 */
export function analyzeCascadingImpact(
  node: SupplierNode,
  downstreamLinks: number, // number of dependent nodes
  affectedMaterialIds: string[],
  affectedSkuIds: string[],
  averageMaterialCost: number
): CascadingImpactAnalysis {
  // Direct impact based on criticality and tier
  const criticalityScore = { 'low': 25, 'medium': 50, 'high': 75, 'critical': 100 }[node.criticality] || 50;
  const tierMultiplier = 1 + (node.tier - 1) * 0.3; // Tier 1 = 1.0, Tier 2 = 1.3, etc.
  const directImpact = Math.min(100, criticalityScore * tierMultiplier);

  // Downstream risk (how much it affects your operations)
  const downstreamRisk = Math.min(100, directImpact * (1 + downstreamLinks * 0.2));

  // Financial impact estimation
  const materialImpact = affectedMaterialIds.length * averageMaterialCost * 100; // 100 units buffer
  const skuDisruptionCost = affectedSkuIds.length * 50000; // $50k per SKU in lost production
  const estimatedFinancialImpact = materialImpact + skuDisruptionCost;

  return {
    directImpact,
    downstreamRisk,
    affectedMaterialCount: affectedMaterialIds.length,
    affectedSkuCount: affectedSkuIds.length,
    estimatedFinancialImpact
  };
}

/**
 * Generate recommended actions based on regime and risk level
 */
export function generateRegimeAwareActions(
  regime: string,
  fdr: number,
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): string[] {
  const actions: string[] = [];

  if (regime === 'Healthy Expansion') {
    if (riskLevel === 'high' || riskLevel === 'critical') {
      actions.push('Diversify supplier base while conditions are stable');
      actions.push('Negotiate long-term contracts to lock in favorable terms');
    }
  } else if (regime === 'Asset-Led Growth') {
    // FDR > 1.05: Financial bubble territory
    actions.push('CAUTION: Asset-led regime - monitor supplier financial health weekly');
    actions.push('Increase safety stock for critical materials (25-40% buffer)');
    if (riskLevel === 'high' || riskLevel === 'critical') {
      actions.push('URGENT: Identify and qualify backup suppliers NOW');
      actions.push('Consider dual-sourcing for all critical materials');
    }
  } else if (regime === 'Imbalanced Excess') {
    // FDR very high: Bubble about to burst
    actions.push('WARNING: Peak bubble risk - prepare for supplier failures');
    actions.push('Audit supplier financials and credit ratings monthly');
    actions.push('Build 60-90 day safety stock for all critical inputs');
    actions.push('Activate contingency suppliers and pre-qualify alternatives');
  } else if (regime === 'Real Economy Lead') {
    // FDR < 0.95: Real economy slowing
    actions.push('Counter-cyclical opportunity: Lock in advantageous supplier contracts');
    if (riskLevel === 'high' || riskLevel === 'critical') {
      actions.push('Suppliers facing demand slowdown - negotiate better terms');
      actions.push('Monitor for capacity reductions that could affect future supply');
    }
  }

  return actions;
}

/**
 * Score alternative suppliers for replacement recommendation
 * Returns sorted list of candidates
 */
export interface AlternativeSupplierScore {
  nodeId: string;
  supplierId: string;
  score: number; // 0-100, higher = better alternative
  advantages: string[];
  disadvantages: string[];
}

export function scoreAlternativeSuppliers(
  failingNode: SupplierNode,
  alternatives: SupplierNode[]
): AlternativeSupplierScore[] {
  const scored = alternatives.map(alt => {
    let score = 50; // base score
    const advantages: string[] = [];
    const disadvantages: string[] = [];

    // Better financial health = higher score
    const healthDiff = (alt.financialHealthScore || 50) - (failingNode.financialHealthScore || 50);
    score += healthDiff * 0.4;
    if (healthDiff > 20) advantages.push(`Stronger financial health (+${healthDiff.toFixed(0)} points)`);
    if (healthDiff < -10) disadvantages.push(`Weaker financial health (${healthDiff.toFixed(0)} points)`);

    // Lower bankruptcy risk = higher score
    const bankruptcyDiff = (failingNode.bankruptcyRisk || 0) - (alt.bankruptcyRisk || 0);
    score += bankruptcyDiff * 0.5;
    if (bankruptcyDiff > 20) advantages.push(`Lower bankruptcy risk (-${bankruptcyDiff.toFixed(0)}%)`);

    // Better on-time delivery = higher score
    const deliveryDiff = (alt.onTimeDeliveryRate || 90) - (failingNode.onTimeDeliveryRate || 90);
    score += deliveryDiff * 0.3;
    if (deliveryDiff > 5) advantages.push(`Better delivery performance (+${deliveryDiff.toFixed(0)}%)`);
    if (deliveryDiff < -5) disadvantages.push(`Worse delivery performance (${deliveryDiff.toFixed(0)}%)`);

    // Better quality = higher score
    const qualityDiff = (alt.qualityScore || 80) - (failingNode.qualityScore || 80);
    score += qualityDiff * 0.2;
    if (qualityDiff > 5) advantages.push(`Higher quality score (+${qualityDiff.toFixed(0)} points)`);

    // Same region = bonus (logistics)
    if (alt.region === failingNode.region) {
      score += 10;
      advantages.push('Same region - no logistics disruption');
    } else {
      disadvantages.push('Different region - may require logistics changes');
    }

    // Lower tier = slightly better (more direct)
    if (alt.tier < failingNode.tier) {
      score += 5;
      advantages.push(`More direct supplier (Tier ${alt.tier} vs Tier ${failingNode.tier})`);
    }

    // Better FDR regime exposure
    if (alt.currentFDR !== null && failingNode.currentFDR !== null) {
      const altFDRRisk = Math.abs(alt.currentFDR - 1.0);
      const failingFDRRisk = Math.abs(failingNode.currentFDR - 1.0);
      if (altFDRRisk < failingFDRRisk) {
        score += 8;
        advantages.push('Better economic regime exposure');
      }
    }

    return {
      nodeId: alt.id,
      supplierId: alt.supplierId,
      score: Math.min(100, Math.max(0, score)),
      advantages,
      disadvantages
    };
  });

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}
