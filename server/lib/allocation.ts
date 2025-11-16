import type { PolicySignal } from "./economics";

interface BomEntry {
  [material: string]: number;
}

interface SupplierTerms {
  unit_cost: number;
  lead_time_days: number;
}

interface ProcurementPlan {
  buy_qty: number;
  cost: number;
}

interface PolicyKnobs {
  inventory_buffer_factor: number;
  tighten_credit: boolean;
  extend_payables: boolean;
  capex_gate: boolean;
}

interface AllocationKPIs {
  fill_rate_by_sku: Record<string, number>;
  budget_spent: number;
  budget_remaining: number;
  planned_output_margin_proxy: number;
  material_cost_implied: number;
}

export interface AllocationPlan {
  production_targets: Record<string, number>;
  sku_allocation_units: Record<string, number>;
  material_remaining: Record<string, number>;
  procurement_plan: Record<string, ProcurementPlan>;
  policy_knobs: PolicyKnobs;
  kpis: AllocationKPIs;
}

function safeDiv(a: number, b: number, defaultValue: number = 0.0): number {
  return b !== 0 ? a / b : defaultValue;
}

export class AllocationEngine {
  private bom: Record<string, BomEntry>;
  private onHand: Record<string, number>;
  private inbound: Record<string, number>;
  private budget: number;
  private supplierTerms: Record<string, SupplierTerms>;

  constructor(
    bom: Record<string, BomEntry>,
    onHand: Record<string, number>,
    inbound: Record<string, number>,
    budget: number,
    supplierTerms: Record<string, SupplierTerms>
  ) {
    this.bom = bom;
    this.onHand = onHand;
    this.inbound = inbound;
    this.budget = budget;
    this.supplierTerms = supplierTerms;
  }

  private materialNeedForSku(sku: string, plannedUnits: number): Record<string, number> {
    const need: Record<string, number> = {};
    const bomEntry = this.bom[sku] || {};
    
    for (const [material, perUnit] of Object.entries(bomEntry)) {
      need[material] = (need[material] || 0) + perUnit * plannedUnits;
    }
    
    return need;
  }

  private availableMaterial(material: string): number {
    return (this.onHand[material] || 0) + (this.inbound[material] || 0);
  }

  plan(
    forecastBySku: Record<string, number>,
    regimeSignals: PolicySignal[],
    priorityBySku: Record<string, number>
  ): AllocationPlan {
    const knobs: PolicyKnobs = {
      inventory_buffer_factor: 1.0,
      tighten_credit: false,
      extend_payables: false,
      capex_gate: false,
    };

    for (const s of regimeSignals) {
      if (["REDUCE_INVENTORY", "SLOW_INVENTORY_BUILD"].includes(s.signal)) {
        knobs.inventory_buffer_factor *= (1.0 - 0.15 * s.intensity);
      }
      if (s.signal === "TIGHTEN_CREDIT_TERMS") {
        knobs.tighten_credit = true;
      }
      if (s.signal === "EXTEND_PAYABLES") {
        knobs.extend_payables = true;
      }
      if (s.signal === "DEFER_EXPANSION_CAPEX") {
        knobs.capex_gate = true;
      }
    }

    const totalW = Object.values(priorityBySku).reduce((sum, w) => sum + w, 0) || 1.0;
    const normPriority: Record<string, number> = {};
    for (const [sku, w] of Object.entries(priorityBySku)) {
      normPriority[sku] = w / totalW;
    }

    const productionTargets: Record<string, number> = {};
    for (const [sku, units] of Object.entries(forecastBySku)) {
      const buffer = 0.10 * knobs.inventory_buffer_factor;
      productionTargets[sku] = Math.max(0.0, units * (1.0 + buffer));
    }

    const aggregateNeeds: Record<string, number> = {};
    for (const [sku, units] of Object.entries(productionTargets)) {
      const need = this.materialNeedForSku(sku, units);
      for (const [m, q] of Object.entries(need)) {
        aggregateNeeds[m] = (aggregateNeeds[m] || 0) + q;
      }
    }

    const available: Record<string, number> = {};
    for (const m of Object.keys(aggregateNeeds)) {
      available[m] = this.availableMaterial(m);
    }

    const skuAllocation: Record<string, number> = {};
    const materialRemaining: Record<string, number> = { ...available };

    const sortedSkus = Object.entries(productionTargets).sort(
      ([skuA], [skuB]) => (normPriority[skuB] || 0) - (normPriority[skuA] || 0)
    );

    for (const [sku, units] of sortedSkus) {
      const bomEntry = this.bom[sku] || {};
      const caps: number[] = [units];
      
      for (const [m, perUnit] of Object.entries(bomEntry)) {
        if (perUnit > 0) {
          caps.push((materialRemaining[m] || 0) / perUnit);
        }
      }
      
      const feasibleUnits = Math.max(0.0, Math.min(...caps));
      skuAllocation[sku] = feasibleUnits;
      
      for (const [m, perUnit] of Object.entries(bomEntry)) {
        materialRemaining[m] = Math.max(0.0, (materialRemaining[m] || 0) - perUnit * feasibleUnits);
      }
    }

    const procurement: Record<string, ProcurementPlan> = {};
    let budgetLeft = this.budget;
    const fillRatio = 0.7 * Math.max(0.6, Math.min(1.4, knobs.inventory_buffer_factor));

    for (const [m, totalNeed] of Object.entries(aggregateNeeds)) {
      const shortfall = Math.max(0.0, totalNeed - (available[m] || 0));
      const toBuy = shortfall * fillRatio;
      const terms = this.supplierTerms[m];
      const unitCost = terms?.unit_cost || 0;
      const cost = unitCost * toBuy;
      
      if (cost <= budgetLeft && unitCost > 0) {
        procurement[m] = { buy_qty: toBuy, cost };
        budgetLeft -= cost;
      } else if (unitCost > 0 && budgetLeft > 0) {
        const qty = budgetLeft / unitCost;
        procurement[m] = { buy_qty: qty, cost: budgetLeft };
        budgetLeft = 0.0;
      }
    }

    let plannedOutputValue = 0.0;
    let totalMaterialCostImplied = 0.0;
    
    for (const [sku, units] of Object.entries(skuAllocation)) {
      let perUnitMaterialCost = 0.0;
      const bomEntry = this.bom[sku] || {};
      
      for (const [m, perUnit] of Object.entries(bomEntry)) {
        const terms = this.supplierTerms[m];
        const perCost = terms?.unit_cost || 0;
        perUnitMaterialCost += perUnit * perCost;
      }
      
      const marginProxy = Math.max(0.0, 0.25 - 0.5 * safeDiv(perUnitMaterialCost, 100.0, 0.0));
      plannedOutputValue += units * marginProxy;
      totalMaterialCostImplied += units * perUnitMaterialCost;
    }

    const kpis: AllocationKPIs = {
      fill_rate_by_sku: {},
      budget_spent: this.budget - budgetLeft,
      budget_remaining: budgetLeft,
      planned_output_margin_proxy: plannedOutputValue,
      material_cost_implied: totalMaterialCostImplied,
    };

    for (const sku of Object.keys(skuAllocation)) {
      kpis.fill_rate_by_sku[sku] = safeDiv(skuAllocation[sku], productionTargets[sku], 0.0);
    }

    return {
      production_targets: productionTargets,
      sku_allocation_units: skuAllocation,
      material_remaining: materialRemaining,
      procurement_plan: procurement,
      policy_knobs: knobs,
      kpis,
    };
  }
}
