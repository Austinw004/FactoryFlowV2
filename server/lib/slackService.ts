import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  accessory?: any;
}

export type AlertType = 
  | 'regime_change'
  | 'stockout_warning'
  | 'supplier_risk'
  | 'price_movement'
  | 'forecast_degradation'
  | 'budget_alert'
  | 'general';

interface AlertConfig {
  color: string;
  emoji: string;
  priority: 'high' | 'medium' | 'low';
}

const ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
  regime_change: { color: '#FF6B6B', emoji: ':chart_with_upwards_trend:', priority: 'high' },
  stockout_warning: { color: '#FFE66D', emoji: ':warning:', priority: 'high' },
  supplier_risk: { color: '#FF8C42', emoji: ':rotating_light:', priority: 'medium' },
  price_movement: { color: '#4ECDC4', emoji: ':money_with_wings:', priority: 'medium' },
  forecast_degradation: { color: '#95E1D3', emoji: ':crystal_ball:', priority: 'low' },
  budget_alert: { color: '#F38181', emoji: ':moneybag:', priority: 'medium' },
  general: { color: '#6C5CE7', emoji: ':bell:', priority: 'low' },
};

export class SlackService {
  private webhookUrl: string | null = null;
  private defaultChannel: string = '#prescient-alerts';

  configure(webhookUrl: string, defaultChannel?: string) {
    this.webhookUrl = webhookUrl;
    if (defaultChannel) {
      this.defaultChannel = defaultChannel;
    }
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('[Slack] Not configured - skipping message');
      return false;
    }

    try {
      await axios.post(this.webhookUrl, {
        ...message,
        channel: message.channel || this.defaultChannel,
        username: message.username || 'Prescient Labs',
        icon_emoji: message.icon_emoji || ':factory:',
      });
      return true;
    } catch (error: any) {
      console.error('[Slack] Failed to send message:', error.message);
      return false;
    }
  }

  async sendAlert(
    alertType: AlertType,
    title: string,
    description: string,
    details?: Record<string, string>,
    actionUrl?: string
  ): Promise<boolean> {
    const config = ALERT_CONFIGS[alertType];
    
    const fields = details
      ? Object.entries(details).map(([key, value]) => ({
          title: key,
          value: value,
          short: true,
        }))
      : [];

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${config.emoji} ${title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: description,
        },
      },
    ];

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: fields.map(f => `*${f.title}:* ${f.value}`).join('\n'),
        },
      });
    }

    if (actionUrl) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${actionUrl}|View in Prescient Labs →>`,
        },
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Priority: *${config.priority.toUpperCase()}* | ${new Date().toLocaleString()}`,
        },
      ],
    });

    return this.sendMessage({
      text: `${config.emoji} ${title}`,
      attachments: [
        {
          color: config.color,
          text: description,
          fields,
          footer: 'Prescient Labs',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
      blocks,
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
      `The economic regime has shifted from *${previousRegime}* to *${newRegime}*. Review your procurement strategy.`,
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
      `Stock levels for *${materialName}* are critically low and may result in a stockout.`,
      {
        'Current Stock': currentStock.toString(),
        'Reorder Point': reorderPoint.toString(),
        'Days Until Stockout': `${daysUntilStockout} days`,
      }
    );
  }

  async sendSupplierRiskAlert(
    supplierName: string,
    riskScore: number,
    riskTier: string,
    topRiskFactor: string
  ): Promise<boolean> {
    return this.sendAlert(
      'supplier_risk',
      `Supplier Risk Alert: ${supplierName}`,
      `Supplier *${supplierName}* has been flagged with elevated risk levels.`,
      {
        'Supplier': supplierName,
        'Risk Score': `${riskScore}/100`,
        'Risk Tier': riskTier.toUpperCase(),
        'Top Risk Factor': topRiskFactor,
      }
    );
  }

  async sendPriceMovementAlert(
    commodityName: string,
    priceChange: number,
    currentPrice: number,
    recommendation: string
  ): Promise<boolean> {
    const direction = priceChange > 0 ? 'increased' : 'decreased';
    return this.sendAlert(
      'price_movement',
      `Price Alert: ${commodityName}`,
      `${commodityName} price has ${direction} by ${Math.abs(priceChange).toFixed(1)}%.`,
      {
        'Commodity': commodityName,
        'Price Change': `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
        'Current Price': `$${currentPrice.toFixed(2)}`,
        'Recommendation': recommendation,
      }
    );
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.webhookUrl) {
      return { success: false, message: 'Slack webhook URL not configured' };
    }

    try {
      const result = await this.sendMessage({
        text: ':white_check_mark: Prescient Labs connected successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':white_check_mark: *Prescient Labs Connected*\n\nYou will now receive real-time alerts for:\n• Economic regime changes\n• Low stock warnings\n• Supplier risk alerts\n• Price movement notifications',
            },
          },
        ],
      });

      return result
        ? { success: true, message: 'Connection successful' }
        : { success: false, message: 'Failed to send test message' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async syncAlertHistoryAsDemandSignals(companyId: string, alerts: Array<{type: AlertType; channel: string; title: string; timestamp: Date}>): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    for (const alert of alerts) {
      try {
        const config = ALERT_CONFIGS[alert.type];
        await storage.createDemandSignal({
          companyId,
          signalType: 'slack_alert',
          signalDate: alert.timestamp,
          quantity: 1,
          unit: 'alert',
          channel: 'slack',
          confidence: 100,
          priority: config.priority,
          attributes: {
            source: 'slack',
            alertType: alert.type,
            slackChannel: alert.channel,
            alertTitle: alert.title
          }
        });
        synced++;
      } catch (err: any) {
        errors.push(`Alert ${alert.type}: ${err.message}`);
      }
    }

    console.log(`[Slack] Synced ${synced} alert history as demand signals`);
    return { synced, errors };
  }
}

export const slackService = new SlackService();

export async function getSlackService(companyId: string): Promise<SlackService | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'slack');
    if (credentials?.webhookUrl) {
      console.log(`[Slack] Using centralized credential storage for company ${companyId}`);
      const service = new SlackService();
      service.configure(credentials.webhookUrl);
      return service;
    }
  } catch (error) {
    console.log(`[Slack] Credentials not available for company ${companyId}`);
  }
  
  if (slackService.isConfigured()) {
    return slackService;
  }
  return null;
}
