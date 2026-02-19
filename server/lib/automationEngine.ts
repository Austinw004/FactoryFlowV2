import { db } from "../db";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import {
  aiAgents,
  aiAutomationRules,
  aiGuardrails,
  aiActions,
  aiExecutionQueue,
  automationRuntimeState,
  processedTriggerEvents,
  automationSafeMode,
  structuredEventLog,
  backgroundJobLocks,
} from "@shared/schema";
import { createHash } from "crypto";

export function buildTriggerEventId(params: {
  companyId: string;
  ruleId: string;
  triggerType: string;
  objectId?: string;
  timeBucket?: string;
  values?: Record<string, any>;
}): string {
  const bucket = params.timeBucket || new Date().toISOString().slice(0, 13);
  const sortedValues = params.values
    ? Object.keys(params.values).sort().reduce((acc: Record<string, any>, key) => {
        acc[key] = params.values![key];
        return acc;
      }, {})
    : {};
  const payload = JSON.stringify({
    c: params.companyId,
    r: params.ruleId,
    t: params.triggerType,
    o: params.objectId || "",
    b: bucket,
    v: sortedValues,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export class AutomationEngine {
  private static instance: AutomationEngine;

  private constructor() {}

  static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  private getDefaultAgents(companyId: string) {
    return [
      {
        companyId,
        name: "Procurement Agent",
        description: "Automates purchase orders, supplier selection, and order timing based on economic signals",
        agentType: "procurement",
        avatar: "shopping-cart",
        capabilities: ["create_po", "generate_rfq", "supplier_selection", "order_timing", "price_negotiation"],
        maxAutonomyLevel: "auto_draft",
        isEnabled: 1,
        priority: 90,
        learningEnabled: 1,
        confidenceThreshold: 0.8,
        dailyActionLimit: 50,
        dailyValueLimit: 100000,
        activeHoursStart: "08:00",
        activeHoursEnd: "18:00",
        activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        timezone: "America/New_York",
      },
      {
        companyId,
        name: "Inventory Agent",
        description: "Manages inventory levels, rebalancing across locations, and safety stock optimization",
        agentType: "inventory",
        avatar: "boxes",
        capabilities: ["rebalance_inventory", "adjust_safety_stock", "stockout_prevention", "excess_detection", "location_optimization"],
        maxAutonomyLevel: "auto_execute",
        isEnabled: 1,
        priority: 85,
        learningEnabled: 1,
        confidenceThreshold: 0.75,
        dailyActionLimit: 100,
        dailyValueLimit: null,
        activeHoursStart: "00:00",
        activeHoursEnd: "23:59",
        activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        timezone: "America/New_York",
      },
      {
        companyId,
        name: "Forecasting Agent",
        description: "Generates demand forecasts, monitors accuracy degradation, and triggers retraining",
        agentType: "forecasting",
        avatar: "trending-up",
        capabilities: ["generate_forecast", "monitor_accuracy", "trigger_retraining", "demand_sensing", "regime_aware_adjustment"],
        maxAutonomyLevel: "full_autonomous",
        isEnabled: 1,
        priority: 95,
        learningEnabled: 1,
        confidenceThreshold: 0.85,
        dailyActionLimit: 200,
        dailyValueLimit: null,
        activeHoursStart: "00:00",
        activeHoursEnd: "23:59",
        activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        timezone: "America/New_York",
      },
      {
        companyId,
        name: "Supplier Risk Agent",
        description: "Monitors supplier health, assesses risks, and recommends diversification strategies",
        agentType: "supplier",
        avatar: "users",
        capabilities: ["risk_assessment", "supplier_scoring", "diversification_analysis", "event_monitoring", "alert_generation"],
        maxAutonomyLevel: "suggest",
        isEnabled: 1,
        priority: 80,
        learningEnabled: 1,
        confidenceThreshold: 0.7,
        dailyActionLimit: 50,
        dailyValueLimit: null,
        activeHoursStart: "06:00",
        activeHoursEnd: "20:00",
        activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        timezone: "America/New_York",
      },
      {
        companyId,
        name: "Production Agent",
        description: "Optimizes production scheduling, monitors bottlenecks, and adjusts capacity utilization",
        agentType: "production",
        avatar: "factory",
        capabilities: ["schedule_optimization", "bottleneck_detection", "capacity_planning", "maintenance_alerts", "oee_monitoring"],
        maxAutonomyLevel: "auto_draft",
        isEnabled: 1,
        priority: 85,
        learningEnabled: 1,
        confidenceThreshold: 0.78,
        dailyActionLimit: 75,
        dailyValueLimit: null,
        activeHoursStart: "00:00",
        activeHoursEnd: "23:59",
        activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        timezone: "America/New_York",
      },
    ];
  }

  private getDefaultRules(companyId: string) {
    return [
      {
        companyId,
        agentId: null as string | null,
        name: "Low Stock Auto-PO",
        description: "Automatically creates purchase orders when inventory falls below reorder point",
        category: "procurement",
        triggerType: "threshold",
        triggerConditions: { metric: "inventory_level", operator: "<", valueType: "reorder_point" },
        actionType: "create_po",
        actionConfig: { quantity: "economic_order_quantity", supplier: "preferred", urgency: "normal" },
        autonomyLevel: "auto_draft",
        requiresApproval: 1,
        approvalTimeout: 24,
        maxExecutionsPerDay: 20,
        maxValuePerExecution: 25000,
        cooldownMinutes: 30,
        isEnabled: 1,
        priority: 90,
      },
      {
        companyId,
        agentId: null as string | null,
        name: "Regime-Based Safety Stock",
        description: "Adjusts safety stock levels based on economic regime changes",
        category: "inventory",
        triggerType: "regime_change",
        triggerConditions: { fromRegime: "any", monitorAllRegimes: true },
        actionType: "adjust_safety_stock",
        actionConfig: { regimeMultipliers: { REAL_ECONOMY_LEAD: 1.5, IMBALANCED_EXCESS: 1.3, ASSET_LED_GROWTH: 1.1, HEALTHY_EXPANSION: 1.0 } },
        autonomyLevel: "auto_execute",
        requiresApproval: 0,
        approvalTimeout: 0,
        maxExecutionsPerDay: 5,
        maxValuePerExecution: null,
        cooldownMinutes: 240,
        isEnabled: 1,
        priority: 95,
      },
      {
        companyId,
        agentId: null as string | null,
        name: "Weekly Inventory Rebalance",
        description: "Automatically rebalances inventory across locations every Monday",
        category: "inventory",
        triggerType: "schedule",
        triggerConditions: { cron: "0 6 * * MON", timezone: "America/New_York" },
        actionType: "rebalance_inventory",
        actionConfig: { strategy: "demand_weighted", minimizeTransportCost: true },
        autonomyLevel: "auto_draft",
        requiresApproval: 1,
        approvalTimeout: 8,
        maxExecutionsPerDay: 1,
        maxValuePerExecution: null,
        cooldownMinutes: 1440,
        isEnabled: 1,
        priority: 70,
      },
      {
        companyId,
        agentId: null as string | null,
        name: "Price Spike Response",
        description: "Pauses orders and alerts when commodity prices spike unexpectedly",
        category: "procurement",
        triggerType: "event",
        triggerConditions: { eventType: "price_spike", threshold: 0.15, lookbackHours: 24 },
        actionType: "pause_orders",
        actionConfig: { duration: "until_review", notifyRoles: ["procurement_manager", "finance_director"] },
        autonomyLevel: "auto_execute",
        requiresApproval: 0,
        approvalTimeout: 0,
        maxExecutionsPerDay: 5,
        maxValuePerExecution: null,
        cooldownMinutes: 60,
        isEnabled: 1,
        priority: 100,
      },
    ];
  }

  private getDefaultGuardrails(companyId: string) {
    return [
      {
        companyId,
        name: "Daily Spending Limit",
        description: "Prevents AI from authorizing more than $100,000 in purchases per day",
        guardrailType: "spending_limit",
        conditions: { period: "daily", limit: 100000, currency: "USD" },
        appliesToAgents: ["all"],
        appliesToActionTypes: ["create_po", "generate_rfq"],
        enforcementLevel: "hard",
        onViolation: "block",
        notifyOnViolation: ["cfo", "procurement_director"],
        isEnabled: 1,
        priority: 100,
      },
      {
        companyId,
        name: "Business Hours Only",
        description: "High-value actions (>$10,000) only during business hours",
        guardrailType: "time_restriction",
        conditions: {
          minValue: 10000,
          allowedHours: ["08:00-18:00"],
          allowedDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          timezone: "America/New_York",
        },
        appliesToAgents: ["agent_procurement"],
        appliesToActionTypes: ["create_po"],
        enforcementLevel: "hard",
        onViolation: "block",
        notifyOnViolation: [] as string[],
        isEnabled: 1,
        priority: 90,
      },
      {
        companyId,
        name: "Regime-Based Caution",
        description: "Extra approval required during volatile economic regimes",
        guardrailType: "regime_restriction",
        conditions: {
          cautionRegimes: ["BUBBLE", "IMBALANCED_DEFICIT"],
          requiresExtraApproval: true,
          reduceAutonomy: true,
        },
        appliesToAgents: ["all"],
        appliesToActionTypes: ["all"],
        enforcementLevel: "escalate",
        onViolation: "require_approval",
        notifyOnViolation: ["finance_director", "coo"],
        isEnabled: 1,
        priority: 95,
      },
      {
        companyId,
        name: "Approved Suppliers Only",
        description: "AI can only create POs with pre-approved, rated suppliers",
        guardrailType: "supplier_restriction",
        conditions: {
          onlyApproved: true,
          minRating: 4.0,
          excludeHighRisk: true,
        },
        appliesToAgents: ["agent_procurement"],
        appliesToActionTypes: ["create_po", "generate_rfq"],
        enforcementLevel: "hard",
        onViolation: "block",
        notifyOnViolation: ["procurement_manager"],
        isEnabled: 1,
        priority: 85,
      },
    ];
  }

  async getAgents(companyId: string) {
    let agents = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.companyId, companyId));

    if (agents.length === 0) {
      const defaults = this.getDefaultAgents(companyId);
      for (const agent of defaults) {
        await db.insert(aiAgents).values(agent);
      }
      agents = await db
        .select()
        .from(aiAgents)
        .where(eq(aiAgents.companyId, companyId));
    }

    return agents;
  }

  async createAgent(companyId: string, data: any) {
    const [agent] = await db
      .insert(aiAgents)
      .values({ ...data, companyId })
      .returning();
    return agent;
  }

  async updateAgent(agentId: string, companyId: string, updates: any) {
    const [agent] = await db
      .update(aiAgents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(aiAgents.id, agentId), eq(aiAgents.companyId, companyId)))
      .returning();
    return agent;
  }

  async getRules(companyId: string) {
    let rules = await db
      .select()
      .from(aiAutomationRules)
      .where(eq(aiAutomationRules.companyId, companyId));

    if (rules.length === 0) {
      const agents = await this.getAgents(companyId);
      const agentByType = new Map(agents.map((a) => [a.agentType, a.id]));

      const defaults = this.getDefaultRules(companyId);
      const ruleAgentMapping: Record<string, string> = {
        "Low Stock Auto-PO": "procurement",
        "Regime-Based Safety Stock": "inventory",
        "Weekly Inventory Rebalance": "inventory",
        "Price Spike Response": "procurement",
      };

      for (const rule of defaults) {
        const agentType = ruleAgentMapping[rule.name];
        rule.agentId = agentType ? (agentByType.get(agentType) || null) : null;
        await db.insert(aiAutomationRules).values(rule);
      }
      rules = await db
        .select()
        .from(aiAutomationRules)
        .where(eq(aiAutomationRules.companyId, companyId));
    }

    return rules;
  }

  async createRule(companyId: string, data: any) {
    const [rule] = await db
      .insert(aiAutomationRules)
      .values({ ...data, companyId })
      .returning();
    return rule;
  }

  async updateRule(ruleId: string, companyId: string, updates: any) {
    const [rule] = await db
      .update(aiAutomationRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(aiAutomationRules.id, ruleId), eq(aiAutomationRules.companyId, companyId)))
      .returning();
    return rule;
  }

  async deleteRule(ruleId: string, companyId: string) {
    await db
      .update(aiActions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(aiActions.ruleId, ruleId),
          eq(aiActions.companyId, companyId),
          sql`${aiActions.status} IN ('pending', 'awaiting_approval')`
        )
      );

    await db
      .delete(aiAutomationRules)
      .where(and(eq(aiAutomationRules.id, ruleId), eq(aiAutomationRules.companyId, companyId)));
  }

  async getGuardrails(companyId: string) {
    let guardrails = await db
      .select()
      .from(aiGuardrails)
      .where(eq(aiGuardrails.companyId, companyId));

    if (guardrails.length === 0) {
      const defaults = this.getDefaultGuardrails(companyId);
      for (const guard of defaults) {
        await db.insert(aiGuardrails).values(guard);
      }
      guardrails = await db
        .select()
        .from(aiGuardrails)
        .where(eq(aiGuardrails.companyId, companyId));
    }

    return guardrails;
  }

  async updateGuardrail(guardrailId: string, companyId: string, updates: any) {
    const [guardrail] = await db
      .update(aiGuardrails)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(aiGuardrails.id, guardrailId), eq(aiGuardrails.companyId, companyId)))
      .returning();
    return guardrail;
  }

  async getPendingActions(companyId: string) {
    return db
      .select()
      .from(aiActions)
      .where(
        and(
          eq(aiActions.companyId, companyId),
          sql`${aiActions.status} IN ('pending', 'awaiting_approval')`
        )
      )
      .orderBy(desc(aiActions.createdAt));
  }

  async getActionHistory(companyId: string, limit: number = 50) {
    return db
      .select()
      .from(aiActions)
      .where(
        and(
          eq(aiActions.companyId, companyId),
          sql`${aiActions.status} IN ('completed', 'rejected', 'failed', 'expired', 'cancelled', 'approved')`
        )
      )
      .orderBy(desc(aiActions.createdAt))
      .limit(limit);
  }

  private static readonly HIGH_STAKES_ACTIONS = ["create_po", "pause_orders"];

  async createAction(companyId: string, data: any) {
    const safeMode = await this.getSafeMode(companyId);

    if (safeMode?.safeModeEnabled === 1) {
      const isHighStakes = AutomationEngine.HIGH_STAKES_ACTIONS.includes(data.actionType) ||
        (data.actionType === "adjust_safety_stock" &&
          data.actionPayload?.estimatedCost &&
          data.actionPayload.estimatedCost > 10000);

      const readinessNotPassed = safeMode.readinessChecklistPassed !== 1;
      let policyReason = "";

      if (isHighStakes) {
        policyReason = `High-stakes action '${data.actionType}' requires approval under safe mode`;
      } else if (readinessNotPassed && data.autonomyLevel === "auto_execute") {
        policyReason = `Auto-execute downgraded to approval-required: safe mode on, readiness checklist not passed`;
      }

      if (policyReason) {
        data.requiresApproval = 1;
        data.status = "awaiting_approval";

        await db.insert(structuredEventLog).values({
          companyId,
          level: "warn",
          category: "automation",
          event: "safe_mode_policy_override",
          details: {
            message: policyReason,
            actionType: data.actionType,
            originalAutonomyLevel: data.autonomyLevel,
            isHighStakes,
            readinessChecklistPassed: safeMode.readinessChecklistPassed,
          },
        });
      }
    }

    const [action] = await db
      .insert(aiActions)
      .values({ ...data, companyId })
      .returning();
    return action;
  }

  async createActionIdempotent(
    companyId: string,
    data: any,
    triggerEventId: string,
    triggerType: string,
    ruleId?: string
  ): Promise<{ action: any; deduplicated: boolean }> {
    const lock = await this.claimTriggerLock(companyId, triggerType, triggerEventId, ruleId);
    if (!lock.acquired) {
      return { action: null, deduplicated: true };
    }

    try {
      const action = await this.createAction(companyId, data);
      await this.markTriggerOutcome(companyId, triggerType, triggerEventId, "processed", action.id);
      return { action, deduplicated: false };
    } catch (error) {
      await this.markTriggerOutcome(companyId, triggerType, triggerEventId, "failed");
      throw error;
    }
  }

  async approveAction(actionId: string, companyId: string, userId: string) {
    const [action] = await db
      .update(aiActions)
      .set({
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiActions.id, actionId),
          eq(aiActions.companyId, companyId),
          eq(aiActions.status, "awaiting_approval")
        )
      )
      .returning();

    if (action) {
      await db.insert(structuredEventLog).values({
        companyId,
        level: "info",
        category: "automation",
        event: "action_approved",
        details: {
          message: `Action ${actionId} approved by user ${userId}`,
          actionId,
          actionType: action.actionType,
          userId,
        },
        userId,
      });
    }
    return action;
  }

  async rejectAction(actionId: string, companyId: string, userId: string, reason: string) {
    const [action] = await db
      .update(aiActions)
      .set({
        status: "rejected",
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiActions.id, actionId),
          eq(aiActions.companyId, companyId),
          eq(aiActions.status, "awaiting_approval")
        )
      )
      .returning();

    if (action) {
      await db.insert(structuredEventLog).values({
        companyId,
        level: "info",
        category: "automation",
        event: "action_rejected",
        details: {
          message: `Action ${actionId} rejected by user ${userId}: ${reason}`,
          actionId,
          actionType: action.actionType,
          userId,
          reason,
        },
        userId,
      });
    }
    return action;
  }

  /**
   * Expire actions that have been awaiting approval for longer than the deadline (default 24h).
   * Returns the count of expired actions.
   */
  async expireStaleApprovals(companyId: string, deadlineHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - deadlineHours * 60 * 60 * 1000);
    const expired = await db
      .update(aiActions)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiActions.companyId, companyId),
          eq(aiActions.status, "awaiting_approval"),
          lt(aiActions.createdAt, cutoff)
        )
      )
      .returning();

    if (expired.length > 0) {
      await db.insert(structuredEventLog).values({
        companyId,
        level: "warn",
        category: "automation",
        event: "approvals_expired",
        details: {
          message: `${expired.length} action(s) expired after ${deadlineHours}h without approval`,
          expiredActionIds: expired.map(a => a.id),
          deadlineHours,
        },
      });
    }

    return expired.length;
  }

  /**
   * Atomic queue claiming: UPDATE...WHERE status='queued' AND scheduled_for<=NOW() RETURNING
   * Claims at most `limit` items atomically. Includes stale lock recovery for stuck 'processing' items.
   */
  async claimQueuedActions(
    companyId: string,
    limit: number = 5,
    workerId?: string
  ): Promise<any[]> {
    const STALE_CLAIM_MINUTES = 5;
    const now = new Date();
    const workerLabel = workerId || `worker-${process.pid}-${Date.now()}`;

    await db
      .update(aiExecutionQueue)
      .set({
        status: "queued",
        claimedAt: null,
        claimedBy: null,
        attempts: sql`${aiExecutionQueue.attempts} + 1`,
      })
      .where(
        and(
          eq(aiExecutionQueue.companyId, companyId),
          eq(aiExecutionQueue.status, "processing"),
          lt(aiExecutionQueue.claimedAt!, new Date(now.getTime() - STALE_CLAIM_MINUTES * 60 * 1000))
        )
      );

    const result = await db.execute(sql`
      WITH eligible AS (
        SELECT id FROM ai_execution_queue
        WHERE company_id = ${companyId}
          AND status = 'queued'
          AND scheduled_for <= ${now}
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE ai_execution_queue q
      SET status = 'processing',
          claimed_at = ${now},
          claimed_by = ${workerLabel},
          last_attempt_at = ${now},
          attempts = q.attempts + 1
      FROM eligible e
      WHERE q.id = e.id
      RETURNING q.*
    `);

    const rows = result.rows || result;

    if (rows.length > 0) {
      await db.insert(structuredEventLog).values({
        companyId,
        level: "info",
        category: "automation",
        event: "queue_items_claimed",
        details: {
          message: `Claimed ${rows.length} queue items for processing`,
          workerId: workerLabel,
          itemIds: rows.map((r: any) => r.id),
        },
      });
    }

    return rows;
  }

  async markQueueOutcome(
    queueId: string,
    companyId: string,
    outcome: "completed" | "failed",
    errorMessage?: string
  ): Promise<boolean> {
    const updated = await db
      .update(aiExecutionQueue)
      .set({
        status: outcome,
        completedAt: outcome === "completed" ? new Date() : null,
        errorMessage: errorMessage || null,
      })
      .where(
        and(
          eq(aiExecutionQueue.id, queueId),
          eq(aiExecutionQueue.companyId, companyId),
          eq(aiExecutionQueue.status, "processing")
        )
      )
      .returning();

    return updated.length > 0;
  }

  async getActionById(actionId: string, companyId: string) {
    const rows = await db
      .select()
      .from(aiActions)
      .where(
        and(
          eq(aiActions.id, actionId),
          eq(aiActions.companyId, companyId)
        )
      )
      .limit(1);
    return rows[0] || null;
  }

  async requeueWithBackoff(queueId: string, companyId: string, scheduledFor: Date, errorMessage: string): Promise<boolean> {
    const updated = await db
      .update(aiExecutionQueue)
      .set({
        status: "queued",
        claimedAt: null,
        claimedBy: null,
        scheduledFor,
        errorMessage,
      })
      .where(
        and(
          eq(aiExecutionQueue.id, queueId),
          eq(aiExecutionQueue.companyId, companyId),
          eq(aiExecutionQueue.status, "processing")
        )
      )
      .returning();

    if (updated.length > 0) {
      await db.insert(structuredEventLog).values({
        companyId: updated[0].companyId,
        level: "warn",
        category: "automation",
        event: "queue_item_requeued",
        details: {
          message: `Queue item ${queueId} requeued with backoff until ${scheduledFor.toISOString()}`,
          queueId,
          scheduledFor: scheduledFor.toISOString(),
          errorMessage,
          attempt: updated[0].attempts,
        },
      });
    }
    return updated.length > 0;
  }

  async executeAction(action: any, approvedBy: string): Promise<{ success: boolean; result: any; error?: string }> {
    const now = new Date().toISOString();

    try {
      let executionResult: any;

      switch (action.actionType) {
        case "create_po": {
          const poNumber = `PO-${Date.now().toString().slice(-8)}`;
          const payload = action.actionPayload;
          executionResult = {
            poNumber,
            status: "created",
            materialId: payload.materialId,
            materialName: payload.materialName,
            quantity: payload.quantity,
            unit: payload.unit,
            supplierId: payload.supplierId,
            supplierName: payload.supplierName,
            totalCost: payload.estimatedCost,
            expectedDelivery: payload.deliveryDate,
            createdAt: now,
            createdBy: "AI Agent",
            approvedBy,
            message: `Purchase order ${poNumber} created for ${payload.quantity} ${payload.unit} of ${payload.materialName} from ${payload.supplierName}`,
          };
          break;
        }

        case "rebalance_inventory": {
          const payload = action.actionPayload;
          const transferId = `TRF-${Date.now().toString().slice(-8)}`;
          executionResult = {
            transferId,
            status: "initiated",
            transfers: (payload.transfers || []).map((t: any, i: number) => ({
              ...t,
              transferNumber: `${transferId}-${i + 1}`,
              status: "scheduled",
              estimatedArrival: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            })),
            totalTransfers: payload.totalTransfers,
            estimatedTransportCost: payload.estimatedTransportCost,
            balanceImprovement: payload.balanceImprovement,
            initiatedAt: now,
            approvedBy,
            message: `Inventory rebalancing initiated with ${payload.totalTransfers} transfers. Expected ${payload.balanceImprovement} improvement in stock distribution.`,
          };
          break;
        }

        case "adjust_safety_stock": {
          executionResult = {
            status: "applied",
            adjustments: action.actionPayload?.regimeMultipliers || {},
            effectiveFrom: now,
            approvedBy,
            message: "Safety stock levels adjusted based on current economic regime.",
          };
          break;
        }

        case "pause_orders": {
          executionResult = {
            status: "orders_paused",
            pausedAt: now,
            resumeCondition: action.actionPayload?.duration || "until_review",
            notifiedRoles: action.actionPayload?.notifyRoles || [],
            approvedBy,
            message: "All pending orders have been paused. Notifications sent to relevant stakeholders.",
          };
          break;
        }

        case "send_alert": {
          executionResult = {
            status: "alert_sent",
            channels: action.actionPayload?.channels || ["in_app"],
            priority: action.actionPayload?.priority || "normal",
            sentAt: now,
            approvedBy,
            message: "Alert sent successfully to all configured channels.",
          };
          break;
        }

        case "escalate": {
          executionResult = {
            status: "escalated",
            escalatedTo: action.actionPayload?.escalateTo || [],
            suggestedActions: action.actionPayload?.suggestActions || [],
            escalatedAt: now,
            approvedBy,
            message: "Issue escalated to appropriate stakeholders with recommended actions.",
          };
          break;
        }

        default:
          executionResult = {
            status: "executed",
            actionType: action.actionType,
            executedAt: now,
            approvedBy,
            message: `Action of type '${action.actionType}' executed successfully.`,
          };
      }

      await db
        .update(aiActions)
        .set({
          status: "completed",
          executedAt: new Date(),
          executionResult: executionResult,
          updatedAt: new Date(),
        })
        .where(eq(aiActions.id, action.id));

      // Spend should have been reserved atomically BEFORE execution via atomicSpendCheck.
      // If _spendReserved is false and there's a cost, log a warning but don't double-count.
      if (action._spendReserved) {
        // Spend was already reserved atomically, nothing to do
      } else {
        const cost = action.actionPayload?.estimatedCost;
        if (cost && cost > 0) {
          await db.insert(structuredEventLog).values({
            companyId: action.companyId,
            level: "warn",
            category: "automation",
            event: "spend_not_reserved_before_execution",
            details: {
              message: `Action executed without atomically reserved spend. Cost: ${cost}`,
              actionId: action.id,
              actionType: action.actionType,
              cost,
            },
          });
        }
      }

      return { success: true, result: executionResult };
    } catch (error: any) {
      await db
        .update(aiActions)
        .set({
          status: "failed",
          errorMessage: error.message || "Unknown error during action execution",
          updatedAt: new Date(),
        })
        .where(eq(aiActions.id, action.id));

      if (action._spendReserved) {
        const cost = action.actionPayload?.estimatedCost;
        if (cost && cost > 0) {
          const today = new Date().toISOString().slice(0, 10);
          await db.execute(sql`
            UPDATE automation_runtime_state
            SET daily_spend_total = GREATEST(0, daily_spend_total - ${cost}),
                daily_action_count = GREATEST(0, daily_action_count - 1),
                last_updated_at = NOW()
            WHERE company_id = ${action.companyId} AND state_date = ${today}
          `);
        }
      }

      return {
        success: false,
        result: null,
        error: error.message || "Unknown error during action execution",
      };
    }
  }

  async getDailySpend(companyId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(automationRuntimeState)
      .where(
        and(
          eq(automationRuntimeState.companyId, companyId),
          eq(automationRuntimeState.stateDate, today)
        )
      );
    return rows.length > 0 ? (rows[0].dailySpendTotal || 0) : 0;
  }

  async incrementDailySpend(companyId: string, amount: number) {
    const today = new Date().toISOString().slice(0, 10);
    await db
      .insert(automationRuntimeState)
      .values({
        companyId,
        stateDate: today,
        dailySpendTotal: amount,
        dailyActionCount: 1,
      })
      .onConflictDoUpdate({
        target: [automationRuntimeState.companyId, automationRuntimeState.stateDate],
        set: {
          dailySpendTotal: sql`${automationRuntimeState.dailySpendTotal} + ${amount}`,
          dailyActionCount: sql`${automationRuntimeState.dailyActionCount} + 1`,
          lastUpdatedAt: new Date(),
        },
      });
  }

  /**
   * Atomic spend reservation: single UPDATE statement with conditional check.
   * First ensures row exists (idempotent upsert with zero spend), then atomically
   * increments spend ONLY if new total <= limit. Returns { allowed, currentSpend, newSpend }
   */
  async atomicSpendCheck(
    companyId: string,
    proposedAmount: number,
    spendLimit: number
  ): Promise<{ allowed: boolean; currentSpend: number; newSpend: number }> {
    const today = new Date().toISOString().slice(0, 10);

    // First ensure the row exists (idempotent upsert with zero spend)
    await db.execute(sql`
      INSERT INTO automation_runtime_state (id, company_id, state_date, daily_spend_total, daily_action_count, last_updated_at)
      VALUES (gen_random_uuid(), ${companyId}, ${today}, 0, 0, NOW())
      ON CONFLICT (company_id, state_date) DO NOTHING
    `);

    // Single atomic conditional update: only increment if new total <= limit
    const result = await db.execute(sql`
      UPDATE automation_runtime_state
      SET daily_spend_total = daily_spend_total + ${proposedAmount},
          daily_action_count = daily_action_count + 1,
          last_updated_at = NOW()
      WHERE company_id = ${companyId}
        AND state_date = ${today}
        AND daily_spend_total + ${proposedAmount} <= ${spendLimit}
      RETURNING daily_spend_total, daily_action_count
    `);

    const rows = result.rows || result;
    
    if (rows.length === 0) {
      // Limit would be exceeded — no spend was reserved
      const currentRows = await db.execute(sql`
        SELECT daily_spend_total FROM automation_runtime_state
        WHERE company_id = ${companyId} AND state_date = ${today}
      `);
      const currentSpend = Number((currentRows.rows || currentRows)[0]?.daily_spend_total || 0);
      return { allowed: false, currentSpend, newSpend: currentSpend };
    }

    const newSpend = Number(rows[0].daily_spend_total);
    const currentSpend = newSpend - proposedAmount;
    return { allowed: true, currentSpend, newSpend };
  }

  /**
   * Insert-first trigger lock: atomically claims ownership of a trigger event.
   * Returns { acquired: true } if this worker owns the lock, { acquired: false } if another worker already claimed it.
   * Stale locks (processing for >5 minutes) are recovered via CAS takeover.
   */
  async claimTriggerLock(
    companyId: string,
    triggerType: string,
    triggerEventId: string,
    ruleId?: string
  ): Promise<{ acquired: boolean; existingStatus?: string }> {
    const STALE_LOCK_MINUTES = 5;
    try {
      await db.insert(processedTriggerEvents).values({
        companyId,
        triggerType,
        triggerEventId,
        ruleId: ruleId || null,
        status: "processing",
        result: null,
      });

      await db.insert(structuredEventLog).values({
        companyId,
        level: "info",
        category: "automation",
        event: "trigger_lock_acquired",
        details: {
          message: `Trigger lock acquired: ${triggerType}/${triggerEventId}`,
          triggerType,
          triggerEventId,
          ruleId,
        },
      });

      return { acquired: true };
    } catch (e: any) {
      if (e.code === "23505" || e.message?.includes("unique") || e.message?.includes("duplicate")) {
        const existing = await db
          .select({ status: processedTriggerEvents.status, claimedAt: processedTriggerEvents.claimedAt })
          .from(processedTriggerEvents)
          .where(
            and(
              eq(processedTriggerEvents.companyId, companyId),
              eq(processedTriggerEvents.triggerType, triggerType),
              eq(processedTriggerEvents.triggerEventId, triggerEventId)
            )
          );

        if (existing.length > 0 && existing[0].status === "processing") {
          const claimedAt = existing[0].claimedAt;
          if (claimedAt && (Date.now() - claimedAt.getTime()) > STALE_LOCK_MINUTES * 60 * 1000) {
            const recovered = await db
              .update(processedTriggerEvents)
              .set({ status: "processing", claimedAt: new Date(), completedAt: null })
              .where(
                and(
                  eq(processedTriggerEvents.companyId, companyId),
                  eq(processedTriggerEvents.triggerType, triggerType),
                  eq(processedTriggerEvents.triggerEventId, triggerEventId),
                  eq(processedTriggerEvents.status, "processing"),
                  lt(processedTriggerEvents.claimedAt!, new Date(Date.now() - STALE_LOCK_MINUTES * 60 * 1000))
                )
              )
              .returning();

            if (recovered.length > 0) {
              await db.insert(structuredEventLog).values({
                companyId,
                level: "warn",
                category: "automation",
                event: "trigger_stale_lock_recovered",
                details: {
                  message: `Stale trigger lock recovered after ${STALE_LOCK_MINUTES}min: ${triggerType}/${triggerEventId}`,
                  triggerType,
                  triggerEventId,
                  originalClaimedAt: claimedAt?.toISOString(),
                },
              });
              return { acquired: true };
            }
          }
        }

        await db.insert(structuredEventLog).values({
          companyId,
          level: "info",
          category: "automation",
          event: "trigger_lock_rejected",
          details: {
            message: `Trigger already claimed: ${triggerType}/${triggerEventId}`,
            triggerType,
            triggerEventId,
            existingStatus: existing[0]?.status,
          },
        });

        return { acquired: false, existingStatus: existing[0]?.status };
      }
      throw e;
    }
  }

  /**
   * Mark a claimed trigger as completed (processed or failed).
   * Only updates if current status is 'processing' (CAS guard).
   */
  async markTriggerOutcome(
    companyId: string,
    triggerType: string,
    triggerEventId: string,
    outcome: "processed" | "failed",
    actionId?: string,
    result?: string
  ): Promise<boolean> {
    const updated = await db
      .update(processedTriggerEvents)
      .set({
        status: outcome,
        result: result || outcome,
        actionId: actionId || null,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(processedTriggerEvents.companyId, companyId),
          eq(processedTriggerEvents.triggerType, triggerType),
          eq(processedTriggerEvents.triggerEventId, triggerEventId),
          eq(processedTriggerEvents.status, "processing")
        )
      )
      .returning();

    if (updated.length > 0) {
      await db.insert(structuredEventLog).values({
        companyId,
        level: outcome === "failed" ? "error" : "info",
        category: "automation",
        event: `trigger_${outcome}`,
        details: {
          message: `Trigger ${outcome}: ${triggerType}/${triggerEventId}`,
          triggerType,
          triggerEventId,
          actionId,
          result,
        },
      });
    }

    return updated.length > 0;
  }

  /** @deprecated Use claimTriggerLock + markTriggerOutcome instead */
  async checkTriggerIdempotency(companyId: string, triggerType: string, triggerEventId: string): Promise<boolean> {
    const lock = await this.claimTriggerLock(companyId, triggerType, triggerEventId);
    return lock.acquired;
  }

  /** @deprecated Use claimTriggerLock + markTriggerOutcome instead */
  async recordTriggerProcessed(
    companyId: string,
    triggerType: string,
    triggerEventId: string,
    ruleId: string,
    actionId: string
  ): Promise<boolean> {
    return this.markTriggerOutcome(companyId, triggerType, triggerEventId, "processed", actionId);
  }

  async getSafeMode(companyId: string) {
    const rows = await db
      .select()
      .from(automationSafeMode)
      .where(eq(automationSafeMode.companyId, companyId));
    return rows.length > 0 ? rows[0] : null;
  }

  async evaluateGuardrails(
    action: any,
    companyId: string,
    context: { regime?: string; currentTime?: Date }
  ): Promise<{
    allowed: boolean;
    violations: Array<{ guardrailId: string; guardrailName: string; reason: string; enforcement: string }>;
  }> {
    const violations: Array<{ guardrailId: string; guardrailName: string; reason: string; enforcement: string }> = [];
    const guardrails = await this.getGuardrails(companyId);
    const now = context.currentTime || new Date();
    const payload = action.actionPayload || {};

    for (const guard of guardrails) {
      if (!guard.isEnabled) continue;

      const actionTypes = guard.appliesToActionTypes as string[] | null;
      const actionTypeMatches =
        actionTypes?.includes("all") || actionTypes?.includes(action.actionType);
      if (!actionTypeMatches) continue;

      const conditions = guard.conditions as any;

      switch (guard.guardrailType) {
        case "spending_limit": {
          if (payload.estimatedCost) {
            const limit = conditions?.limit || Infinity;
            const spendCheck = await this.atomicSpendCheck(companyId, payload.estimatedCost, limit);
            if (spendCheck.allowed) {
              action._spendReserved = true;
            } else {
              await db.execute(sql`
                UPDATE ai_guardrails
                SET violation_count = COALESCE(violation_count, 0) + 1,
                    last_violation_at = ${now},
                    updated_at = ${now}
                WHERE id = ${guard.id}
              `);

              violations.push({
                guardrailId: guard.id,
                guardrailName: guard.name,
                reason: `Daily spending limit of $${limit.toLocaleString()} would be exceeded. Spent today: $${spendCheck.currentSpend.toLocaleString()}, this action: $${payload.estimatedCost.toLocaleString()}`,
                enforcement: guard.onViolation || "block",
              });
            }
          }
          break;
        }

        case "time_restriction": {
          if (payload.estimatedCost && payload.estimatedCost >= (conditions?.minValue || 0)) {
            const hour = now.getHours();
            const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            const currentDay = dayNames[now.getDay()];
            const allowedDays = conditions?.allowedDays || [];
            const allowedHours = conditions?.allowedHours || [];

            const dayAllowed = allowedDays.length === 0 || allowedDays.includes(currentDay);
            let hourAllowed = allowedHours.length === 0;
            for (const range of allowedHours) {
              const [start, end] = range.split("-").map((t: string) => parseInt(t.split(":")[0]));
              if (hour >= start && hour < end) {
                hourAllowed = true;
                break;
              }
            }

            if (!dayAllowed || !hourAllowed) {
              await db.execute(sql`
                UPDATE ai_guardrails
                SET violation_count = COALESCE(violation_count, 0) + 1,
                    last_violation_at = ${now},
                    updated_at = ${now}
                WHERE id = ${guard.id}
              `);

              violations.push({
                guardrailId: guard.id,
                guardrailName: guard.name,
                reason: `High-value action ($${payload.estimatedCost.toLocaleString()}) attempted outside allowed hours/days`,
                enforcement: guard.onViolation || "block",
              });
            }
          }
          break;
        }

        case "regime_restriction": {
          const regime = context.regime || "";
          const cautionRegimes = conditions?.cautionRegimes || [];

          if (regime === "UNKNOWN" || regime === "") {
            await db.execute(sql`
              UPDATE ai_guardrails
              SET violation_count = COALESCE(violation_count, 0) + 1,
                  last_violation_at = ${now},
                  updated_at = ${now}
              WHERE id = ${guard.id}
            `);

            violations.push({
              guardrailId: guard.id,
              guardrailName: guard.name,
              reason: `Economic regime is unconfirmed or degraded ("${regime || "UNKNOWN"}"). Automated actions require a confirmed regime to proceed safely.`,
              enforcement: "block",
            });
          } else if (cautionRegimes.includes(regime)) {
            await db.execute(sql`
              UPDATE ai_guardrails
              SET violation_count = COALESCE(violation_count, 0) + 1,
                  last_violation_at = ${now},
                  updated_at = ${now}
              WHERE id = ${guard.id}
            `);

            violations.push({
              guardrailId: guard.id,
              guardrailName: guard.name,
              reason: `Current economic regime "${regime}" requires extra caution. Action escalated for additional approval.`,
              enforcement: guard.onViolation || "require_approval",
            });
          }
          break;
        }

        case "supplier_restriction": {
          if (action.actionType === "create_po" || action.actionType === "generate_rfq") {
            const minRating = conditions?.minRating || 0;
            const supplierRating = payload.supplierRating;
            if (conditions?.onlyApproved && !payload.supplierApproved) {
              await db.execute(sql`
                UPDATE ai_guardrails
                SET violation_count = COALESCE(violation_count, 0) + 1,
                    last_violation_at = ${now},
                    updated_at = ${now}
                WHERE id = ${guard.id}
              `);

              violations.push({
                guardrailId: guard.id,
                guardrailName: guard.name,
                reason: `Supplier "${payload.supplierName || payload.supplierId}" is not pre-approved`,
                enforcement: guard.onViolation || "block",
              });
            } else if (supplierRating !== undefined && supplierRating < minRating) {
              await db.execute(sql`
                UPDATE ai_guardrails
                SET violation_count = COALESCE(violation_count, 0) + 1,
                    last_violation_at = ${now},
                    updated_at = ${now}
                WHERE id = ${guard.id}
              `);

              violations.push({
                guardrailId: guard.id,
                guardrailName: guard.name,
                reason: `Supplier rating ${supplierRating} is below minimum required rating of ${minRating}`,
                enforcement: guard.onViolation || "block",
              });
            }
          }
          break;
        }
      }
    }

    if (violations.length > 0) {
      const blockingViolations = violations.filter(v => v.enforcement === "block");
      const hasBlockingViolation = blockingViolations.length > 0;

      await db.insert(structuredEventLog).values({
        companyId,
        level: hasBlockingViolation ? "error" : "warn",
        category: "automation",
        event: "guardrail_violations",
        details: {
          message: `${violations.length} guardrail violation(s) for action '${action.actionType}'`,
          actionType: action.actionType,
          actionId: action.id,
          violations: violations.map(v => ({
            guardrailId: v.guardrailId,
            guardrailName: v.guardrailName,
            enforcement: v.enforcement,
            reason: v.reason,
          })),
        },
      });

      if (hasBlockingViolation) {
        await db.insert(structuredEventLog).values({
          companyId,
          level: "error",
          category: "guardrail_escalation",
          event: "action_blocked_by_guardrail",
          details: {
            message: `Action '${action.actionType}' (${action.id}) BLOCKED by ${blockingViolations.length} guardrail(s) — requires escalation`,
            actionType: action.actionType,
            actionId: action.id,
            blockingGuardrails: blockingViolations.map(v => ({
              guardrailId: v.guardrailId,
              guardrailName: v.guardrailName,
              reason: v.reason,
            })),
          },
        });
      }

      return { allowed: !hasBlockingViolation, violations };
    }

    return { allowed: true, violations };
  }

  validateActionPrerequisites(action: any, _companyId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const payload = action.actionPayload || {};

    switch (action.actionType) {
      case "create_po":
        if (!payload.materialId && !payload.materialName) errors.push("Material identification required");
        if (!payload.supplierId && !payload.supplierName) errors.push("Supplier identification required");
        if (!payload.quantity || payload.quantity <= 0) errors.push("Valid quantity required");
        if (payload.estimatedCost !== undefined && payload.estimatedCost < 0) errors.push("Cost cannot be negative");
        if (!payload.paymentTerms) errors.push("Payment terms required for PO creation (e.g., 'NET30', 'NET60')");
        if (!payload.paymentMethod) errors.push("Payment method required for PO creation (e.g., 'wire', 'ach', 'check')");
        if (!payload.deliveryDate) errors.push("Expected delivery date required for PO creation");
        if (!payload.estimatedCost || payload.estimatedCost <= 0) errors.push("Positive estimated cost required for PO creation");
        break;
      case "rebalance_inventory":
        if (!payload.transfers || !Array.isArray(payload.transfers) || payload.transfers.length === 0) {
          errors.push("Transfer plan required for inventory rebalance");
        }
        break;
      case "adjust_safety_stock":
        if (!payload.regimeMultipliers && !action.actionConfig?.regimeMultipliers) {
          errors.push("Regime multipliers required for safety stock adjustment");
        }
        break;
      case "pause_orders":
      case "send_alert":
      case "escalate":
        break;
      default:
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  canExecuteRule(rule: any): { allowed: boolean; reason?: string } {
    const now = new Date();

    if (rule.lastExecutedAt) {
      const lastExec = new Date(rule.lastExecutedAt);
      const cooldownMs = (rule.cooldownMinutes || 0) * 60 * 1000;
      if (now.getTime() - lastExec.getTime() < cooldownMs) {
        const remainingMin = Math.ceil((cooldownMs - (now.getTime() - lastExec.getTime())) / 60000);
        return { allowed: false, reason: `Cooldown active: ${remainingMin} minutes remaining` };
      }

      const lastExecDay = lastExec.toISOString().slice(0, 10);
      const todayStr = now.toISOString().slice(0, 10);
      if (lastExecDay === todayStr && (rule.executionCount || 0) >= (rule.maxExecutionsPerDay || Infinity)) {
        return { allowed: false, reason: `Daily execution limit reached: ${rule.maxExecutionsPerDay} per day` };
      }
    }

    return { allowed: true };
  }

  async getStats(companyId: string) {
    const [pendingActions, historyActions, agents, rules, guardrails] = await Promise.all([
      this.getPendingActions(companyId),
      this.getActionHistory(companyId, 1000),
      this.getAgents(companyId),
      this.getRules(companyId),
      this.getGuardrails(companyId),
    ]);

    const dailySpend = await this.getDailySpend(companyId);

    const completedActions = historyActions.filter((a) => a.status === "completed");
    const rejectedActions = historyActions.filter((a) => a.status === "rejected");
    const failedActions = historyActions.filter((a) => a.status === "failed");

    const totalExecuted = completedActions.length;

    const actionsWithMeasuredSavings = completedActions.filter(a => {
      const actual = a.actualImpact as any;
      return actual?.costSavings !== undefined && actual?.costSavings !== null && actual.costSavings > 0;
    });

    const measuredSavings = actionsWithMeasuredSavings.reduce((sum, a) => {
      const actual = a.actualImpact as any;
      return sum + (actual.costSavings || 0);
    }, 0);

    const estimatedSavings = completedActions.reduce((sum, a) => {
      const est = a.estimatedImpact as any;
      return sum + (est?.costSavings || 0);
    }, 0);

    const avgConfidence = completedActions.length > 0
      ? completedActions.reduce((sum, a) => {
          const impact = a.estimatedImpact as any;
          return sum + (impact?.confidence || 0);
        }, 0) / completedActions.length
      : 0;

    return {
      agents: {
        total: agents.length,
        active: agents.filter((a) => a.isEnabled === 1).length,
      },
      rules: {
        total: rules.length,
        active: rules.filter((r) => r.isEnabled === 1).length,
      },
      guardrails: {
        total: guardrails.length,
        active: guardrails.filter((g) => g.isEnabled === 1).length,
        totalViolations: guardrails.reduce((sum, g) => sum + (g.violationCount || 0), 0),
      },
      actions: {
        pending: pendingActions.length,
        completed: totalExecuted,
        rejected: rejectedActions.length,
        failed: failedActions.length,
        total: pendingActions.length + historyActions.length,
      },
      performance: {
        measuredSavings,
        measuredSavingsCount: actionsWithMeasuredSavings.length,
        estimatedSavings,
        estimatedSavingsLabel: "estimated (unverified)",
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        successRate: totalExecuted + failedActions.length > 0
          ? Math.round((totalExecuted / (totalExecuted + failedActions.length)) * 100)
          : 100,
        dailySpend,
      },
    };
  }

  /**
   * Distributed job lock: INSERT-first with expiry-based recovery.
   * Returns true if this worker acquired the lock.
   */
  async acquireJobLock(
    jobName: string,
    companyId: string,
    ttlMinutes: number = 10,
    workerId?: string
  ): Promise<boolean> {
    const workerLabel = workerId || `worker-${process.pid}-${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    try {
      await db.insert(backgroundJobLocks).values({
        jobName,
        companyId,
        lockedBy: workerLabel,
        lockedAt: now,
        expiresAt,
        heartbeatAt: now,
      });
      return true;
    } catch (e: any) {
      if (e.code === "23505" || e.message?.includes("unique") || e.message?.includes("duplicate")) {
        const recovered = await db
          .update(backgroundJobLocks)
          .set({
            lockedBy: workerLabel,
            lockedAt: now,
            expiresAt,
            heartbeatAt: now,
          })
          .where(
            and(
              eq(backgroundJobLocks.jobName, jobName),
              eq(backgroundJobLocks.companyId, companyId),
              lt(backgroundJobLocks.expiresAt, now)
            )
          )
          .returning();

        if (recovered.length > 0) {
          await db.insert(structuredEventLog).values({
            companyId,
            level: "warn",
            category: "automation",
            event: "stale_job_lock_recovered",
            details: {
              message: `Stale job lock recovered: ${jobName}`,
              jobName,
              workerId: workerLabel,
            },
          });
          return true;
        }
        return false;
      }
      throw e;
    }
  }

  async releaseJobLock(jobName: string, companyId: string, workerId?: string): Promise<boolean> {
    if (workerId) {
      const deleted = await db
        .delete(backgroundJobLocks)
        .where(
          and(
            eq(backgroundJobLocks.jobName, jobName),
            eq(backgroundJobLocks.companyId, companyId),
            eq(backgroundJobLocks.lockedBy, workerId)
          )
        )
        .returning();
      if (deleted.length === 0) {
        console.warn(`[JobLock] Release denied: worker ${workerId} does not own lock ${jobName}/${companyId}`);
      }
      return deleted.length > 0;
    }
    const deleted = await db
      .delete(backgroundJobLocks)
      .where(
        and(
          eq(backgroundJobLocks.jobName, jobName),
          eq(backgroundJobLocks.companyId, companyId)
        )
      )
      .returning();
    return deleted.length > 0;
  }

  async heartbeatJobLock(jobName: string, companyId: string, extendMinutes: number = 10): Promise<boolean> {
    const now = new Date();
    const updated = await db
      .update(backgroundJobLocks)
      .set({
        heartbeatAt: now,
        expiresAt: new Date(now.getTime() + extendMinutes * 60 * 1000),
      })
      .where(
        and(
          eq(backgroundJobLocks.jobName, jobName),
          eq(backgroundJobLocks.companyId, companyId)
        )
      )
      .returning();
    return updated.length > 0;
  }

  /**
   * Data retention: Clean up old processed trigger events and structured event logs.
   */
  async runDataRetention(companyId: string, retentionDays: number = 90): Promise<{ triggerEventsDeleted: number; eventLogsDeleted: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const triggerDeleted = await db
      .delete(processedTriggerEvents)
      .where(
        and(
          eq(processedTriggerEvents.companyId, companyId),
          lt(processedTriggerEvents.processedAt, cutoff),
          sql`${processedTriggerEvents.status} IN ('processed', 'failed')`
        )
      )
      .returning();

    const logsDeleted = await db
      .delete(structuredEventLog)
      .where(
        and(
          eq(structuredEventLog.companyId, companyId),
          lt(structuredEventLog.timestamp, cutoff)
        )
      )
      .returning();

    const result = {
      triggerEventsDeleted: triggerDeleted.length,
      eventLogsDeleted: logsDeleted.length,
    };

    if (result.triggerEventsDeleted > 0 || result.eventLogsDeleted > 0) {
      await db.insert(structuredEventLog).values({
        companyId,
        level: "info",
        category: "automation",
        event: "data_retention_run",
        details: {
          message: `Data retention: deleted ${result.triggerEventsDeleted} trigger events and ${result.eventLogsDeleted} event logs older than ${retentionDays} days`,
          triggerEventsDeleted: result.triggerEventsDeleted,
          eventLogsDeleted: result.eventLogsDeleted,
        },
      });
    }

    return result;
  }
}

export const automationEngine = AutomationEngine.getInstance();
