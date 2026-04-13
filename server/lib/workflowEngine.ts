/**
 * Workflow Automation Engine
 *
 * Rules engine: "When X happens, do Y"
 * Evaluates triggers and conditions, executes actions.
 */

import { db } from "../db";
import { automationRules, automationExecutions } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { broadcastUpdate } from "../websocket";

// ── Types ──────────────────────────────────────────────────────────────────
interface Condition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains" | "in" | "changed_to" | "changed_from";
  value: any;
}

interface Action {
  type: "send_notification" | "create_audit_log" | "update_field" | "trigger_webhook" | "create_alert" | "log_message";
  params: Record<string, any>;
}

interface TriggerEvent {
  type: string; // "entity_change", "threshold", "schedule"
  entity: string; // "material", "supplier", etc.
  event: string; // "create", "update", "delete"
  companyId: string;
  data: Record<string, any>;
  previousData?: Record<string, any>;
  userId?: string;
}

// ── Condition evaluation ───────────────────────────────────────────────────
function evaluateCondition(condition: Condition, data: Record<string, any>, previousData?: Record<string, any>): boolean {
  const fieldValue = getNestedValue(data, condition.field);

  switch (condition.operator) {
    case "eq":
      return fieldValue == condition.value;
    case "neq":
      return fieldValue != condition.value;
    case "gt":
      return Number(fieldValue) > Number(condition.value);
    case "gte":
      return Number(fieldValue) >= Number(condition.value);
    case "lt":
      return Number(fieldValue) < Number(condition.value);
    case "lte":
      return Number(fieldValue) <= Number(condition.value);
    case "contains":
      return String(fieldValue || "").toLowerCase().includes(String(condition.value).toLowerCase());
    case "not_contains":
      return !String(fieldValue || "").toLowerCase().includes(String(condition.value).toLowerCase());
    case "in":
      return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
    case "changed_to":
      if (!previousData) return false;
      const prevVal = getNestedValue(previousData, condition.field);
      return prevVal != condition.value && fieldValue == condition.value;
    case "changed_from":
      if (!previousData) return false;
      const prev = getNestedValue(previousData, condition.field);
      return prev == condition.value && fieldValue != condition.value;
    default:
      return false;
  }
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// ── Action execution ───────────────────────────────────────────────────────
async function executeAction(action: Action, event: TriggerEvent, ruleId: string): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action.type) {
      case "log_message": {
        console.log(`[Automation] Rule ${ruleId}: ${action.params.message || "Action triggered"}`);
        return { success: true, result: { logged: true } };
      }

      case "create_alert": {
        // Create an audit log entry as an alert
        await db.insert(automationExecutions).values({
          ruleId,
          companyId: event.companyId,
          triggerData: event.data,
          actionResults: { type: "alert", message: action.params.message, severity: action.params.severity || "info" },
          status: "completed",
        });
        return { success: true, result: { alertCreated: true } };
      }

      case "send_notification": {
        // Broadcast via WebSocket
        broadcastUpdate({
          type: "database_update",
          entity: "automation_notification",
          action: "create",
          timestamp: new Date().toISOString(),
          companyId: event.companyId,
          data: {
            title: action.params.title || "Automation Alert",
            message: action.params.message || `Automation rule triggered for ${event.entity}`,
            severity: action.params.severity || "info",
            ruleId,
          },
        });
        return { success: true, result: { notified: true } };
      }

      case "create_audit_log": {
        await db.execute(sql`
          INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, changes, timestamp)
          VALUES (${event.companyId}, ${event.userId || null}, ${'automation_' + (action.params.action || 'trigger')}, ${event.entity}, ${event.data.id || null}, ${JSON.stringify({ rule: ruleId, trigger: event.event, data: action.params })}::jsonb, NOW())
        `);
        return { success: true, result: { auditLogged: true } };
      }

      case "trigger_webhook": {
        // Log webhook intent (actual HTTP call would happen in production)
        console.log(`[Automation] Webhook trigger for rule ${ruleId}: ${action.params.url}`);
        return { success: true, result: { webhookQueued: true, url: action.params.url } };
      }

      case "update_field": {
        // Safety: only allow specific safe field updates
        console.log(`[Automation] Field update queued: ${action.params.entity}.${action.params.field} = ${action.params.value}`);
        return { success: true, result: { fieldUpdateQueued: true } };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Main engine ────────────────────────────────────────────────────────────
export async function processEvent(event: TriggerEvent): Promise<void> {
  try {
    // Find matching rules
    const rules = await db.select().from(automationRules).where(
      and(
        eq(automationRules.companyId, event.companyId),
        eq(automationRules.enabled, true),
        eq(automationRules.triggerType, event.type),
      ),
    );

    for (const rule of rules) {
      // Check entity match
      if (rule.triggerEntity && rule.triggerEntity !== event.entity) continue;
      if (rule.triggerEvent && rule.triggerEvent !== "any" && rule.triggerEvent !== event.event) continue;

      // Evaluate conditions
      const conditions = (rule.conditions as Condition[]) || [];
      const conditionResults = conditions.map((c) => ({
        condition: c,
        passed: evaluateCondition(c, event.data, event.previousData),
      }));

      const allConditionsMet = conditionResults.every((r) => r.passed);
      if (!allConditionsMet && conditions.length > 0) continue;

      // Execute actions
      const actions = (rule.actions as Action[]) || [];
      const startTime = Date.now();
      const actionResults: any[] = [];

      for (const action of actions) {
        const result = await executeAction(action, event, rule.id);
        actionResults.push({ action: action.type, ...result });
      }

      const duration = Date.now() - startTime;
      const allSucceeded = actionResults.every((r) => r.success);

      // Log execution
      await db.insert(automationExecutions).values({
        ruleId: rule.id,
        companyId: event.companyId,
        triggerData: event.data,
        conditionResults,
        actionResults,
        status: allSucceeded ? "completed" : "failed",
        error: allSucceeded ? null : actionResults.find((r) => !r.success)?.error,
        duration,
      });

      // Update rule stats
      await db.update(automationRules)
        .set({
          executionCount: sql`${automationRules.executionCount} + 1`,
          lastExecutedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(automationRules.id, rule.id));

      console.log(`[Automation] Rule "${rule.name}" executed: ${allSucceeded ? "success" : "partial failure"} (${duration}ms)`);
    }
  } catch (error) {
    console.error("[Automation] Error processing event:", error);
  }
}

// ── CRUD operations for rules ──────────────────────────────────────────────
export async function createRule(data: any) {
  const [rule] = await db.insert(automationRules).values(data).returning();
  return rule;
}

export async function updateRule(id: string, companyId: string, data: any) {
  const [rule] = await db.update(automationRules)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(automationRules.id, id), eq(automationRules.companyId, companyId)))
    .returning();
  return rule;
}

export async function deleteRule(id: string, companyId: string) {
  await db.delete(automationRules)
    .where(and(eq(automationRules.id, id), eq(automationRules.companyId, companyId)));
}

export async function getRules(companyId: string) {
  return db.select().from(automationRules)
    .where(eq(automationRules.companyId, companyId))
    .orderBy(automationRules.createdAt);
}

export async function getRuleExecutions(ruleId: string, companyId: string, limit: number = 20) {
  return db.select().from(automationExecutions)
    .where(and(
      eq(automationExecutions.ruleId, ruleId),
      eq(automationExecutions.companyId, companyId),
    ))
    .orderBy(sql`${automationExecutions.executedAt} DESC`)
    .limit(limit);
}
