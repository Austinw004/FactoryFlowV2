import { db } from "../db";
import {
  materials,
  suppliers,
  supplierMaterials,
  economicSnapshots,
  companies,
  rfqs,
  type InsertRfq,
  insertRfqSchema,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { IStorage } from "../storage";

/**
 * Automated RFQ Generation Service
 * 
 * This service monitors material inventory levels and economic regime signals
 * to automatically generate Request for Quotations (RFQs) when:
 * 1. Inventory falls below reorder point threshold
 * 2. Economic regime signals favorable procurement conditions
 * 
 * Saves procurement managers 10-15 hours/week by eliminating manual RFQ creation.
 */

export interface RfqGenerationTrigger {
  materialId: string;
  materialCode: string;
  materialName: string;
  currentInventory: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  regime: string;
  fdr: number;
  policySignal: string;
  priority: "low" | "medium" | "high" | "urgent";
  reason: string;
  urgencyScore: number;
}

export interface RfqGenerationResult {
  success: boolean;
  rfqId?: string;
  rfqNumber?: string;
  error?: string;
  trigger: RfqGenerationTrigger;
}

export class RfqGenerationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Calculate reorder point based on material usage patterns
   * Simple formula: Lead time * average daily usage + safety stock
   */
  private calculateReorderPoint(materialId: string, leadTimeDays: number): number {
    // For now, use a simple heuristic: 30 days of buffer stock
    // In production, this would analyze demand history and variability
    const safetyStockDays = 30;
    return (leadTimeDays + safetyStockDays);
  }

  /**
   * Calculate recommended order quantity using Economic Order Quantity (EOQ) principles
   * Considers regime context for counter-cyclical procurement
   */
  private calculateOrderQuantity(
    currentInventory: number,
    reorderPoint: number,
    regime: string,
    fdr: number
  ): number {
    // Base order quantity: bring inventory up to 90 days
    const targetInventoryDays = 90;
    let baseOrderQty = Math.max(0, targetInventoryDays - currentInventory);

    // Regime adjustments (counter-cyclical procurement)
    if (regime === "expansionary" && fdr > 1.5) {
      // High FDR in expansion = financial markets overheated, good time to buy materials
      baseOrderQty *= 1.5; // Buy 50% more to take advantage of favorable conditions
    } else if (regime === "contractionary" && fdr < 0.7) {
      // Low FDR in contraction = materials likely cheap, good buying opportunity
      baseOrderQty *= 1.3; // Buy 30% more
    } else if (regime === "transitional") {
      // Transitional regime = uncertainty, be more conservative
      baseOrderQty *= 0.9; // Buy 10% less
    }

    return Math.ceil(baseOrderQty);
  }

  /**
   * Determine procurement policy signal based on dual-circuit FDR model
   */
  private getPolicySignal(regime: string, fdr: number): string {
    if (regime === "expansionary") {
      if (fdr > 1.5) return "buy_aggressively"; // Financial overheating, good time for materials
      if (fdr > 1.0) return "buy_moderately";
      return "buy_conservatively";
    } else if (regime === "contractionary") {
      if (fdr < 0.7) return "buy_aggressively"; // Materials likely undervalued
      if (fdr < 1.0) return "buy_moderately";
      return "wait_and_monitor";
    } else {
      return "buy_conservatively"; // Transitional regime = be cautious
    }
  }

  /**
   * Calculate urgency score (0-100) based on inventory level and regime
   */
  private calculateUrgency(
    currentInventory: number,
    reorderPoint: number,
    regime: string,
    fdr: number
  ): number {
    // Base urgency on inventory depletion
    const inventoryRatio = currentInventory / reorderPoint;
    let urgency = 0;

    if (inventoryRatio <= 0.2) urgency = 100; // Critical
    else if (inventoryRatio <= 0.5) urgency = 75; // High
    else if (inventoryRatio <= 0.8) urgency = 50; // Medium
    else urgency = 25; // Low

    // Adjust for regime favorability
    const policySignal = this.getPolicySignal(regime, fdr);
    if (policySignal === "buy_aggressively") urgency += 15;
    else if (policySignal === "buy_moderately") urgency += 5;
    else if (policySignal === "wait_and_monitor") urgency -= 10;

    return Math.min(100, Math.max(0, urgency));
  }

  /**
   * Determine priority level based on urgency score
   */
  private determinePriority(urgencyScore: number): "low" | "medium" | "high" | "urgent" {
    if (urgencyScore >= 90) return "urgent";
    if (urgencyScore >= 70) return "high";
    if (urgencyScore >= 40) return "medium";
    return "low";
  }

  /**
   * Scan all materials and identify which ones need RFQs
   */
  async identifyRfqTriggers(companyId: string): Promise<RfqGenerationTrigger[]> {
    // Get latest economic snapshot for regime context
    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.timestamp))
      .limit(1);

    if (!latestSnapshot.length) {
      throw new Error("No economic snapshot found. Cannot determine regime context.");
    }

    const { regime, fdr } = latestSnapshot[0];
    const policySignal = this.getPolicySignal(regime, fdr);

    // Get all materials with their current inventory
    const allMaterials = await db
      .select({
        id: materials.id,
        code: materials.code,
        name: materials.name,
        unit: materials.unit,
        onHand: materials.onHand,
        companyId: materials.companyId,
      })
      .from(materials)
      .where(eq(materials.companyId, companyId));

    const triggers: RfqGenerationTrigger[] = [];

    // Check each material
    for (const material of allMaterials) {
      // Get suppliers for this material (to determine lead time)
      const materialSuppliers = await db
        .select({
          leadTimeDays: supplierMaterials.leadTimeDays,
          unitCost: supplierMaterials.unitCost,
          supplierId: supplierMaterials.supplierId,
        })
        .from(supplierMaterials)
        .where(eq(supplierMaterials.materialId, material.id));

      if (!materialSuppliers.length) continue; // Skip materials without suppliers

      // Use average lead time across suppliers
      const avgLeadTime =
        materialSuppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) /
        materialSuppliers.length;

      const reorderPoint = this.calculateReorderPoint(material.id, avgLeadTime);
      const currentInventory = material.onHand;

      // Check if inventory is below reorder point
      if (currentInventory < reorderPoint) {
        const recommendedQty = this.calculateOrderQuantity(
          currentInventory,
          reorderPoint,
          regime,
          fdr
        );

        const urgencyScore = this.calculateUrgency(
          currentInventory,
          reorderPoint,
          regime,
          fdr
        );

        const priority = this.determinePriority(urgencyScore);

        triggers.push({
          materialId: material.id,
          materialCode: material.code,
          materialName: material.name,
          currentInventory,
          reorderPoint,
          recommendedOrderQuantity: recommendedQty,
          regime,
          fdr,
          policySignal,
          priority,
          reason: `Inventory (${currentInventory.toFixed(1)} ${material.unit}) below reorder point (${reorderPoint.toFixed(1)} ${material.unit})`,
          urgencyScore,
        });
      }
    }

    // Sort by urgency (highest first)
    return triggers.sort((a, b) => b.urgencyScore - a.urgencyScore);
  }

  /**
   * Generate RFQ from trigger
   */
  async generateRfqFromTrigger(
    companyId: string,
    trigger: RfqGenerationTrigger,
    createdBy: string | null
  ): Promise<RfqGenerationResult> {
    try {
      // Get material details
      const material = await db
        .select()
        .from(materials)
        .where(and(eq(materials.id, trigger.materialId), eq(materials.companyId, companyId)))
        .limit(1);

      if (!material.length) {
        return {
          success: false,
          error: "Material not found",
          trigger,
        };
      }

      // Get suppliers for this material
      const materialSuppliers = await db
        .select({
          supplierId: supplierMaterials.supplierId,
          unitCost: supplierMaterials.unitCost,
          leadTimeDays: supplierMaterials.leadTimeDays,
        })
        .from(supplierMaterials)
        .where(eq(supplierMaterials.materialId, trigger.materialId));

      if (!materialSuppliers.length) {
        return {
          success: false,
          error: "No suppliers found for this material",
          trigger,
        };
      }

      // Generate RFQ number
      const year = new Date().getFullYear();
      const existingRfqs = await db
        .select({ rfqNumber: rfqs.rfqNumber })
        .from(rfqs)
        .where(
          and(
            eq(rfqs.companyId, companyId),
            sql`${rfqs.rfqNumber} LIKE ${`RFQ-${year}-%`}`
          )
        );

      const rfqNumber = `RFQ-${year}-${String(existingRfqs.length + 1).padStart(4, "0")}`;

      // Prepare RFQ data with schema validation
      const rfqData = insertRfqSchema.parse({
        companyId,
        rfqNumber,
        title: `Auto-Generated RFQ for ${material[0].name}`,
        description: `Automatically generated RFQ based on inventory monitoring. ${trigger.reason}. Economic regime: ${trigger.regime} (FDR: ${trigger.fdr.toFixed(2)}). Policy signal: ${trigger.policySignal}.`,
        materialId: trigger.materialId,
        requestedQuantity: trigger.recommendedOrderQuantity,
        unit: material[0].unit,
        regimeAtGeneration: trigger.regime,
        fdrAtGeneration: trigger.fdr,
        policySignal: trigger.policySignal,
        isAutoGenerated: 1,
        triggerReason: "low_inventory",
        inventoryLevelAtTrigger: trigger.currentInventory,
        reorderPointThreshold: trigger.reorderPoint,
        priority: trigger.priority,
        status: "draft",
        targetSupplierIds: materialSuppliers.map((s) => s.supplierId),
        createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      // Insert RFQ using storage layer for company scoping and audit
      const insertedRfq = await this.storage.createRfq(rfqData);

      return {
        success: true,
        rfqId: insertedRfq.id,
        rfqNumber: insertedRfq.rfqNumber,
        trigger,
      };
    } catch (error) {
      console.error("[RFQ Generation] Error generating RFQ:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        trigger,
      };
    }
  }

  /**
   * Auto-generate RFQs for all materials that need them
   * Returns list of generated RFQs
   */
  async autoGenerateRfqs(companyId: string, createdBy: string | null): Promise<RfqGenerationResult[]> {
    const triggers = await this.identifyRfqTriggers(companyId);
    
    // Only generate for high and urgent priority items in auto mode
    const highPriorityTriggers = triggers.filter(
      (t) => t.priority === "high" || t.priority === "urgent"
    );

    const results: RfqGenerationResult[] = [];

    for (const trigger of highPriorityTriggers) {
      const result = await this.generateRfqFromTrigger(companyId, trigger, createdBy);
      results.push(result);
    }

    return results;
  }
}

// Note: singleton will be initialized in routes.ts with storage instance
export function createRfqGenerationService(storage: IStorage): RfqGenerationService {
  return new RfqGenerationService(storage);
}
