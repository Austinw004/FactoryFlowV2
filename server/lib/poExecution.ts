import type { IStorage } from '../storage';
import type { PoRule, InsertPoRule, NegotiationPlaybook, ErpConnection, Material, Supplier } from '@shared/schema';

export interface POGenerationContext {
  materialId: string;
  supplierId: string;
  currentInventory: number;
  currentPrice: number;
  priceHistory: Array<{ price: number; date: Date }>;
  fdr: number;
  regime: string;
  demandForecast?: number;
}

export interface PORecommendation {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  reason: string;
  suggestedQuantity: number;
  estimatedValue: number;
  requiresApproval: boolean;
  confidence: number;
  fdrContext: {
    currentFdr: number;
    regime: string;
    optimal: boolean;
  };
  negotiationPlaybook?: NegotiationPlaybook;
}

export interface ApprovalWorkflow {
  steps: Array<{
    stepOrder: number;
    approverType: string;
    approverId?: string;
    description: string;
    autoApproveConditions?: {
      maxValue?: number;
      regimes?: string[];
      suppliers?: string[];
    };
  }>;
  totalSteps: number;
  requiresManualApproval: boolean;
}

export interface ERPIntegrationStatus {
  connected: boolean;
  system?: string;
  capabilities: {
    canReadPOs: boolean;
    canCreatePOs: boolean;
    canUpdatePOs: boolean;
    canReadInventory: boolean;
  };
  lastSync?: Date;
  error?: string;
}

export class POExecutionEngine {
  constructor(private storage: IStorage) {}

  /**
   * Evaluate all PO rules for a given material and context
   */
  async evaluateRules(context: POGenerationContext, companyId: string): Promise<PORecommendation[]> {
    const rules = await this.storage.getEnabledPoRules(companyId);
    const recommendations: PORecommendation[] = [];

    for (const rule of rules) {
      // Filter rules for this material or global rules
      if (rule.materialId && rule.materialId !== context.materialId) {
        continue;
      }

      // Filter by supplier if specified
      if (rule.supplierId && rule.supplierId !== context.supplierId) {
        continue;
      }

      const evaluation = await this.evaluateRule(rule, context, companyId);
      recommendations.push(evaluation);
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      if (a.triggered !== b.triggered) return a.triggered ? -1 : 1;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Evaluate a single PO rule against the current context
   */
  private async evaluateRule(
    rule: PoRule,
    context: POGenerationContext,
    companyId: string
  ): Promise<PORecommendation> {
    const checks: Array<{ passed: boolean; reason: string }> = [];

    // FDR range check
    if (rule.fdrMin !== null && context.fdr < rule.fdrMin) {
      checks.push({ passed: false, reason: `FDR ${context.fdr.toFixed(2)} below minimum ${rule.fdrMin.toFixed(2)}` });
    }
    if (rule.fdrMax !== null && context.fdr > rule.fdrMax) {
      checks.push({ passed: false, reason: `FDR ${context.fdr.toFixed(2)} above maximum ${rule.fdrMax.toFixed(2)}` });
    }

    // Regime check
    if (rule.regime && rule.regime !== context.regime) {
      checks.push({ passed: false, reason: `Current regime ${context.regime} doesn't match required ${rule.regime}` });
    }

    // Inventory check
    if (rule.inventoryMin !== null && context.currentInventory >= rule.inventoryMin) {
      checks.push({ passed: false, reason: `Inventory ${context.currentInventory} above minimum trigger ${rule.inventoryMin}` });
    }
    if (rule.inventoryMax !== null && context.currentInventory > rule.inventoryMax) {
      checks.push({ passed: false, reason: `Inventory ${context.currentInventory} above maximum ${rule.inventoryMax}` });
    }

    // Price check
    if (rule.priceMin !== null && context.currentPrice > rule.priceMin) {
      checks.push({ passed: false, reason: `Price $${context.currentPrice} above maximum $${rule.priceMin}` });
    }
    if (rule.priceMax !== null && context.currentPrice >= rule.priceMax) {
      checks.push({ passed: false, reason: `Price $${context.currentPrice} at or above limit $${rule.priceMax}` });
    }

    // Price change check
    if (rule.priceChange !== null && context.priceHistory.length > 0) {
      const previousPrice = context.priceHistory[0].price;
      const priceChangePercent = ((context.currentPrice - previousPrice) / previousPrice) * 100;
      
      if (Math.abs(priceChangePercent) < Math.abs(rule.priceChange)) {
        checks.push({ 
          passed: false, 
          reason: `Price change ${priceChangePercent.toFixed(1)}% doesn't meet threshold ${rule.priceChange}%` 
        });
      }
    }

    const allPassed = checks.every(c => c.passed) || checks.length === 0;
    const failedChecks = checks.filter(c => !c.passed);

    // Calculate suggested quantity
    let suggestedQuantity = rule.orderQuantity || 0;
    if (rule.orderDuration && context.demandForecast) {
      suggestedQuantity = Math.max(suggestedQuantity, (context.demandForecast / 30) * rule.orderDuration);
    }

    const estimatedValue = suggestedQuantity * context.currentPrice;

    // Check if requires approval
    const requiresApproval = rule.requiresApproval === 1 || 
      (rule.approvalThreshold !== null && estimatedValue >= rule.approvalThreshold);

    // Calculate confidence (100% if all conditions met, decreasing with failures)
    const confidence = allPassed ? 100 : Math.max(0, 100 - (failedChecks.length * 25));

    // Get negotiation playbook if applicable
    let negotiationPlaybook: NegotiationPlaybook | undefined;
    if (allPassed) {
      const playbooks = await this.storage.getNegotiationPlaybooksByRegime(companyId, context.regime);
      negotiationPlaybook = playbooks[0]; // Use first matching playbook
    }

    // Determine if FDR is optimal for this purchase
    const fdrOptimal = this.isFDROptimal(context.fdr, context.regime);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: allPassed,
      reason: allPassed 
        ? `All conditions met for ${rule.name}` 
        : failedChecks.map(c => c.reason).join('; '),
      suggestedQuantity,
      estimatedValue,
      requiresApproval,
      confidence,
      fdrContext: {
        currentFdr: context.fdr,
        regime: context.regime,
        optimal: fdrOptimal,
      },
      negotiationPlaybook,
    };
  }

  /**
   * Determine if current FDR is optimal for purchasing based on regime
   */
  private isFDROptimal(fdr: number, regime: string): boolean {
    // Optimal purchasing conditions by regime
    switch (regime) {
      case 'Healthy Expansion':
        return fdr >= 0.95 && fdr <= 1.05; // Balanced conditions
      
      case 'Asset-Led Growth':
        return fdr > 1.05; // Financial excess - good time for long-term contracts
      
      case 'Imbalanced Excess':
        return fdr < 0.95; // Real economy weak - supplier pressure, good discounts
      
      case 'Real Economy Lead':
        return fdr < 1.0; // Strong real economy - lock in materials before price increases
      
      default:
        return fdr >= 0.95 && fdr <= 1.05;
    }
  }

  /**
   * Generate approval workflow based on PO value and company rules
   */
  async generateApprovalWorkflow(
    poValue: number,
    materialId: string,
    supplierId: string,
    companyId: string
  ): Promise<ApprovalWorkflow> {
    const steps: ApprovalWorkflow['steps'] = [];

    // Basic approval thresholds (can be customized per company)
    if (poValue < 1000) {
      // Auto-approve small purchases
      steps.push({
        stepOrder: 1,
        approverType: 'automatic',
        description: 'Auto-approved: Value under $1,000',
        autoApproveConditions: { maxValue: 1000 },
      });
    } else if (poValue < 10000) {
      // Manager approval
      steps.push({
        stepOrder: 1,
        approverType: 'manager',
        description: 'Manager approval required',
      });
    } else if (poValue < 50000) {
      // Manager + Finance approval
      steps.push({
        stepOrder: 1,
        approverType: 'manager',
        description: 'Manager approval required',
      });
      steps.push({
        stepOrder: 2,
        approverType: 'finance',
        description: 'Finance approval required',
      });
    } else {
      // Full approval chain
      steps.push({
        stepOrder: 1,
        approverType: 'manager',
        description: 'Manager approval required',
      });
      steps.push({
        stepOrder: 2,
        approverType: 'finance',
        description: 'Finance approval required',
      });
      steps.push({
        stepOrder: 3,
        approverType: 'executive',
        description: 'Executive approval required for large purchases',
      });
    }

    return {
      steps,
      totalSteps: steps.length,
      requiresManualApproval: steps.some(s => s.approverType !== 'automatic'),
    };
  }

  /**
   * Get recommended negotiation tactics based on current FDR and regime
   */
  async getRecommendedPlaybook(
    fdr: number,
    regime: string,
    companyId: string
  ): Promise<NegotiationPlaybook | null> {
    const playbooks = await this.storage.getNegotiationPlaybooksByRegime(companyId, regime);

    // Filter by FDR range
    const matchingPlaybooks = playbooks.filter(p => {
      if (p.fdrMin !== null && fdr < p.fdrMin) return false;
      if (p.fdrMax !== null && fdr > p.fdrMax) return false;
      return true;
    });

    // Return the most successful playbook (by avg savings)
    if (matchingPlaybooks.length === 0) return null;
    
    return matchingPlaybooks.reduce((best, current) => {
      const currentSavings = current.avgSavings || 0;
      const bestSavings = best.avgSavings || 0;
      return currentSavings > bestSavings ? current : best;
    });
  }

  /**
   * Get ERP integration status
   */
  async getERPStatus(companyId: string): Promise<ERPIntegrationStatus> {
    const connection = await this.storage.getActiveErpConnection(companyId);

    if (!connection) {
      return {
        connected: false,
        capabilities: {
          canReadPOs: false,
          canCreatePOs: false,
          canUpdatePOs: false,
          canReadInventory: false,
        },
      };
    }

    return {
      connected: connection.status === 'active',
      system: connection.erpSystem,
      capabilities: {
        canReadPOs: connection.canReadPOs === 1,
        canCreatePOs: connection.canCreatePOs === 1,
        canUpdatePOs: connection.canUpdatePOs === 1,
        canReadInventory: connection.canReadInventory === 1,
      },
      lastSync: connection.lastSync || undefined,
      error: connection.lastError || undefined,
    };
  }

  /**
   * Simulate creating a PO in external ERP system
   * (Actual implementation would call real ERP APIs)
   */
  async createPOInERP(
    connection: ErpConnection,
    poData: {
      materialId: string;
      supplierId: string;
      quantity: number;
      unitPrice: number;
      totalValue: number;
    }
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    // This is a stub - in production, this would call actual ERP APIs
    // based on connection.erpSystem (SAP, Oracle, Dynamics, etc.)
    
    if (connection.status !== 'active') {
      return { success: false, error: 'ERP connection is not active' };
    }

    if (connection.canCreatePOs !== 1) {
      return { success: false, error: 'ERP connection lacks PO creation capability' };
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, this would:
    // 1. Decrypt credentials from connection.credentialsEncrypted
    // 2. Authenticate with ERP system using connection.authMethod
    // 3. Call appropriate API endpoint from connection.apiEndpoint
    // 4. Create PO in external system
    // 5. Return external PO ID

    return {
      success: true,
      externalId: `ERP-PO-${Date.now()}`, // Simulated external ID
    };
  }
}
