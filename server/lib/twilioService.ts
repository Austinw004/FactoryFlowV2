import twilio from 'twilio';

export type SMSAlertType = 
  | 'regime_change'
  | 'stockout_warning'
  | 'supplier_risk'
  | 'price_movement'
  | 'urgent';

interface AlertConfig {
  prefix: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const ALERT_CONFIGS: Record<SMSAlertType, AlertConfig> = {
  regime_change: { prefix: '[REGIME CHANGE]', priority: 'high' },
  stockout_warning: { prefix: '[LOW STOCK]', priority: 'critical' },
  supplier_risk: { prefix: '[SUPPLIER RISK]', priority: 'high' },
  price_movement: { prefix: '[PRICE ALERT]', priority: 'medium' },
  urgent: { prefix: '[URGENT]', priority: 'critical' },
};

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeFromEnv();
  }

  private initializeFromEnv() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && phoneNumber) {
      try {
        this.client = twilio(accountSid, authToken);
        this.fromNumber = phoneNumber;
        this.isEnabled = true;
        console.log('[Twilio] Service initialized from environment variables');
      } catch (error: any) {
        console.error('[Twilio] Failed to initialize:', error.message);
      }
    } else {
      console.log('[Twilio] Missing credentials - service not configured');
    }
  }

  configure(accountSid: string, authToken: string, phoneNumber: string) {
    try {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
      this.isEnabled = true;
      console.log('[Twilio] Service configured');
    } catch (error: any) {
      console.error('[Twilio] Configuration failed:', error.message);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.isEnabled && !!this.client && !!this.fromNumber;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const normalizedTo = this.normalizePhoneNumber(to);
      
      const message = await this.client!.messages.create({
        body: body.substring(0, 1600),
        from: this.fromNumber!,
        to: normalizedTo,
      });

      console.log(`[Twilio] SMS sent to ${normalizedTo}: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error: any) {
      console.error('[Twilio] Failed to send SMS:', error.message);
      return { success: false, error: error.message };
    }
  }

  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (!phone.startsWith('+')) {
      return `+${cleaned}`;
    }
    return phone;
  }

  async sendAlert(
    to: string,
    alertType: SMSAlertType,
    title: string,
    message: string,
    actionRequired?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = ALERT_CONFIGS[alertType];
    
    let body = `${config.prefix}: ${title}\n\n${message}`;
    
    if (actionRequired) {
      body += `\n\nAction: ${actionRequired}`;
    }
    
    body += '\n\n- Prescient Labs';
    
    return this.sendSMS(to, body);
  }

  async sendRegimeChangeAlert(
    to: string,
    previousRegime: string,
    newRegime: string,
    recommendation: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendAlert(
      to,
      'regime_change',
      'Economic Regime Shift',
      `${previousRegime} → ${newRegime}`,
      recommendation
    );
  }

  async sendStockoutWarning(
    to: string,
    materialName: string,
    daysUntilStockout: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendAlert(
      to,
      'stockout_warning',
      materialName,
      `${daysUntilStockout} days until stockout`,
      'Reorder immediately'
    );
  }

  async sendSupplierRiskAlert(
    to: string,
    supplierName: string,
    riskLevel: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendAlert(
      to,
      'supplier_risk',
      supplierName,
      `Risk level: ${riskLevel}`,
      'Review supplier alternatives'
    );
  }

  async sendPriceMovementAlert(
    to: string,
    commodityName: string,
    priceChange: number,
    recommendation: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const direction = priceChange > 0 ? 'up' : 'down';
    return this.sendAlert(
      to,
      'price_movement',
      commodityName,
      `Price ${direction} ${Math.abs(priceChange).toFixed(1)}%`,
      recommendation
    );
  }

  async testConnection(testPhoneNumber: string): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'Twilio not configured. Missing Account SID, Auth Token, or Phone Number.' };
    }

    try {
      const result = await this.sendSMS(
        testPhoneNumber,
        'Prescient Labs SMS alerts connected successfully!\n\nYou will receive critical alerts for:\n- Regime changes\n- Stock warnings\n- Supplier risks\n- Price movements'
      );

      return result.success
        ? { success: true, message: `Test SMS sent to ${testPhoneNumber}` }
        : { success: false, message: result.error || 'Failed to send test SMS' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const twilioService = new TwilioService();
