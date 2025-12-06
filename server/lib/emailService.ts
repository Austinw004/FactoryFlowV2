import sendpulse from 'sendpulse-api';

const API_USER_ID = process.env.SENDPULSE_API_USER_ID || '';
const API_SECRET = process.env.SENDPULSE_API_SECRET || '';
const TOKEN_STORAGE = '/tmp/';

let isInitialized = false;

function initSendPulse(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!API_USER_ID || !API_SECRET) {
      console.warn('[Email] SendPulse credentials not configured');
      resolve();
      return;
    }
    
    if (isInitialized) {
      resolve();
      return;
    }

    sendpulse.init(API_USER_ID, API_SECRET, TOKEN_STORAGE, () => {
      isInitialized = true;
      console.log('[Email] SendPulse initialized successfully');
      resolve();
    });
  });
}

export interface EmailOptions {
  to: { name: string; email: string }[];
  subject: string;
  html: string;
  text: string;
  from?: { name: string; email: string };
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await initSendPulse();

    if (!API_USER_ID || !API_SECRET) {
      console.warn('[Email] SendPulse not configured - email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const email = {
      html: options.html,
      text: options.text,
      subject: options.subject,
      from: options.from || {
        name: 'Prescient Labs',
        email: 'noreply@prescientlabs.io'
      },
      to: options.to
    };

    return new Promise((resolve) => {
      sendpulse.smtpSendMail((response: any) => {
        if (response.result === true || response.id) {
          console.log('[Email] Sent successfully:', response.id);
          resolve({ success: true, id: response.id });
        } else {
          console.error('[Email] Failed to send:', response);
          resolve({ success: false, error: response.message || 'Failed to send email' });
        }
      }, email);
    });
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendTeamInvitation(
  recipientEmail: string,
  recipientName: string,
  inviterName: string,
  companyName: string,
  role: string,
  inviteLink: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Prescient Labs</h1>
        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Manufacturing Intelligence Platform</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px 0; font-size: 24px;">You're Invited!</h2>
        <p style="margin: 0; opacity: 0.9;">Join your team on Prescient Labs</p>
      </div>
      
      <p style="font-size: 16px;">Hi ${recipientName || 'there'},</p>
      
      <p style="font-size: 16px;">
        <strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Prescient Labs as a <strong>${role}</strong>.
      </p>
      
      <p style="font-size: 16px;">
        Prescient Labs helps manufacturers make smarter decisions with AI-powered demand forecasting, market timing signals, and supply chain intelligence.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        Or copy and paste this link into your browser:<br>
        <a href="${inviteLink}" style="color: #3b82f6;">${inviteLink}</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        This invitation was sent by ${inviterName} from ${companyName}.<br>
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        &copy; 2025 Prescient Labs. All rights reserved.
      </p>
    </body>
    </html>
  `;

  const text = `
You're Invited to Join Prescient Labs!

Hi ${recipientName || 'there'},

${inviterName} has invited you to join ${companyName} on Prescient Labs as a ${role}.

Prescient Labs helps manufacturers make smarter decisions with AI-powered demand forecasting, market timing signals, and supply chain intelligence.

Accept your invitation here: ${inviteLink}

---
This invitation was sent by ${inviterName} from ${companyName}.
If you didn't expect this invitation, you can safely ignore this email.

© 2025 Prescient Labs. All rights reserved.
  `;

  return sendEmail({
    to: [{ name: recipientName || recipientEmail, email: recipientEmail }],
    subject: `${inviterName} invited you to join ${companyName} on Prescient Labs`,
    html,
    text
  });
}
