import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface TeamsMessage {
  text: string;
  title?: string;
  themeColor?: string;
  sections?: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    activityImage?: string;
    facts?: Array<{ name: string; value: string }>;
    text?: string;
  }>;
  potentialAction?: Array<{
    "@type": string;
    name: string;
    targets: Array<{ os: string; uri: string }>;
  }>;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description: string;
}

export type TeamsAlertType =
  | 'regime_change'
  | 'stockout_warning'
  | 'supplier_risk'
  | 'price_movement'
  | 'forecast_degradation'
  | 'budget_alert'
  | 'general';

interface AlertConfig {
  color: string;
  priority: 'high' | 'medium' | 'low';
}

const ALERT_CONFIGS: Record<TeamsAlertType, AlertConfig> = {
  regime_change: { color: 'FF6B6B', priority: 'high' },
  stockout_warning: { color: 'FFE66D', priority: 'high' },
  supplier_risk: { color: 'FF8C42', priority: 'medium' },
  price_movement: { color: '4ECDC4', priority: 'medium' },
  forecast_degradation: { color: '95E1D3', priority: 'low' },
  budget_alert: { color: 'F38181', priority: 'medium' },
  general: { color: '6C5CE7', priority: 'low' },
};

export class TeamsIntegration {
  private webhookUrl: string;
  private companyId: string;

  constructor(webhookUrl: string, companyId: string) {
    this.webhookUrl = webhookUrl;
    this.companyId = companyId;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.sendMessage({
        text: "Prescient Labs connected successfully!",
        title: "Connection Test",
        themeColor: "00FF00",
        sections: [{
          activityTitle: "Prescient Labs Connected",
          text: "You will now receive real-time alerts for regime changes, stock warnings, supplier risks, and price movements."
        }]
      });
      console.log(`[Teams] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Microsoft Teams connection verified" };
    } catch (error: any) {
      console.error(`[Teams] Connection test failed:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async sendMessage(message: TeamsMessage): Promise<boolean> {
    try {
      const payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: message.themeColor || "0076D7",
        summary: message.title || message.text.substring(0, 50),
        sections: message.sections || [{
          activityTitle: message.title,
          text: message.text
        }],
        potentialAction: message.potentialAction
      };

      await axios.post(this.webhookUrl, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      });

      console.log(`[Teams] Message sent successfully`);
      return true;
    } catch (error: any) {
      console.error("[Teams] Failed to send message:", error.message);
      return false;
    }
  }

  async sendAlert(
    alertType: TeamsAlertType,
    title: string,
    description: string,
    details?: Record<string, string>,
    actionUrl?: string
  ): Promise<boolean> {
    const config = ALERT_CONFIGS[alertType];

    const facts = details
      ? Object.entries(details).map(([name, value]) => ({ name, value }))
      : [];

    const potentialAction = actionUrl
      ? [{
          "@type": "OpenUri",
          name: "View in Prescient Labs",
          targets: [{ os: "default", uri: actionUrl }]
        }]
      : undefined;

    return this.sendMessage({
      title,
      text: description,
      themeColor: config.color,
      sections: [{
        activityTitle: title,
        activitySubtitle: `Priority: ${config.priority.toUpperCase()}`,
        text: description,
        facts
      }],
      potentialAction
    });
  }

  async sendRegimeChangeAlert(
    previousRegime: string,
    newRegime: string,
    fdrValue: number,
    recommendations: string[]
  ): Promise<boolean> {
    return this.sendAlert(
      'regime_change',
      'Economic Regime Change Detected',
      `The economic regime has shifted from **${previousRegime}** to **${newRegime}**. Review your procurement strategy.`,
      {
        'Previous Regime': previousRegime,
        'New Regime': newRegime,
        'FDR Value': fdrValue.toFixed(2),
        'Action Required': recommendations[0] || 'Review dashboard',
      }
    );
  }

  async sendStockoutWarning(
    materialName: string,
    currentStock: number,
    reorderPoint: number,
    daysUntilStockout: number
  ): Promise<boolean> {
    return this.sendAlert(
      'stockout_warning',
      `Low Stock Alert: ${materialName}`,
      `Stock levels for **${materialName}** are critically low and may result in a stockout.`,
      {
        'Current Stock': currentStock.toString(),
        'Reorder Point': reorderPoint.toString(),
        'Days Until Stockout': `${daysUntilStockout} days`,
      }
    );
  }

  async syncAlertHistoryAsDemandSignals(alerts: Array<{type: TeamsAlertType; title: string; timestamp: Date}>): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    for (const alert of alerts) {
      try {
        const config = ALERT_CONFIGS[alert.type];
        await storage.createDemandSignal({
          companyId: this.companyId,
          signalType: 'teams_alert',
          signalDate: alert.timestamp,
          quantity: 1,
          unit: 'alert',
          channel: 'teams',
          confidence: 100,
          priority: config.priority,
          attributes: {
            source: 'microsoft_teams',
            alertType: alert.type,
            alertTitle: alert.title
          }
        });
        synced++;
      } catch (err: any) {
        errors.push(`Alert ${alert.type}: ${err.message}`);
      }
    }

    console.log(`[Teams] Synced ${synced} alert history as demand signals`);
    return { synced, errors };
  }
}

export async function getTeamsIntegration(companyId: string): Promise<TeamsIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'teams');
    if (credentials?.webhookUrl) {
      console.log(`[Teams] Using centralized credential storage for company ${companyId}`);
      return new TeamsIntegration(credentials.webhookUrl, companyId);
    }
  } catch (error) {
    console.log(`[Teams] Credentials not available for company ${companyId}`);
  }
  return null;
}
