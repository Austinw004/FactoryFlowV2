import axios from 'axios';
import type { IStorage } from '../storage';

export interface WebhookPayload {
  event: string;
  companyId: string;
  timestamp: string;
  data: Record<string, any>;
}

export class WebhookService {
  constructor(private storage: IStorage) {}

  async fireWebhook(companyId: string, event: string, data: Record<string, any>): Promise<void> {
    try {
      const company = await this.storage.getCompany(companyId);
      if (!company) {
        return;
      }

      if (!company.webhookUrl) {
        return;
      }

      let enabledEvents: string[] = [];
      if (company.webhookEvents) {
        try {
          enabledEvents = JSON.parse(company.webhookEvents);
        } catch (e) {
          console.error('Failed to parse webhookEvents:', e);
          return;
        }
      }

      if (enabledEvents.length > 0 && !enabledEvents.includes(event)) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        companyId,
        timestamp: new Date().toISOString(),
        data,
      };

      await axios.post(company.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ManufacturingAI-Webhook/1.0',
        },
        timeout: 10000,
      });

      console.log(`Webhook fired successfully for company ${companyId}, event: ${event}`);
    } catch (error) {
      console.error(`Failed to fire webhook for company ${companyId}, event: ${event}`, error);
    }
  }

  async fireRegimeChange(companyId: string, oldRegime: string, newRegime: string, fdr: number): Promise<void> {
    await this.fireWebhook(companyId, 'regime_change', {
      oldRegime,
      newRegime,
      fdr,
      message: `Economic regime changed from ${oldRegime} to ${newRegime}`,
    });
  }

  async fireBudgetAlert(companyId: string, budgetUsed: number, budgetTotal: number, percentUsed: number): Promise<void> {
    await this.fireWebhook(companyId, 'budget_alert', {
      budgetUsed,
      budgetTotal,
      percentUsed,
      message: `Budget usage at ${percentUsed.toFixed(1)}%`,
    });
  }

  async fireAllocationComplete(
    companyId: string, 
    allocationId: number, 
    allocationName: string, 
    totalAllocationCost: number,
    budgetUtilization: number,
    totalProduction: number
  ): Promise<void> {
    await this.fireWebhook(companyId, 'allocation_complete', {
      allocationId,
      allocationName,
      totalAllocationCost,
      budgetUtilization,
      totalProduction,
      message: `Allocation "${allocationName}" completed: $${totalAllocationCost.toLocaleString()} (${budgetUtilization.toFixed(1)}% of budget)`,
    });
  }

  async firePriceAlert(companyId: string, commodity: string, oldPrice: number, newPrice: number, changePercent: number): Promise<void> {
    await this.fireWebhook(companyId, 'price_alert', {
      commodity,
      oldPrice,
      newPrice,
      changePercent,
      message: `Significant price change for ${commodity}: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
    });
  }

  async fireMachineryAlert(companyId: string, machineName: string, alertType: string, message: string): Promise<void> {
    await this.fireWebhook(companyId, 'machinery_alert', {
      machineName,
      alertType,
      message,
    });
  }
}
