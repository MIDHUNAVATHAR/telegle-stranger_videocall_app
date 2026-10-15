import { env } from '../../../../config/env';
import { logger } from '../../../../common/logger';

export interface EmailService {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

export class BrevoEmailService implements EmailService {
  constructor(
    private readonly apiKey: string = env.BREVO_API_KEY,
    private readonly senderEmail: string = env.BREVO_SENDER_EMAIL,
    private readonly senderName: string = env.BREVO_SENDER_NAME
  ) {}

  public async sendOtpEmail(email: string, otp: string): Promise<void> {
    if (!this.apiKey || env.NODE_ENV === 'test') {
      logger.info(`[Brevo Email Service] Mock mode: Verification code email prepared for ${email}`);
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [{ email }],
          subject: 'Your Donkey Play Verification Code',
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #FF5A1F; margin-bottom: 8px;">Donkey Play</h2>
              <p style="font-size: 16px; color: #333;">Welcome! Use the verification code below to sign in:</p>
              <div style="background-color: #FFF4F0; border: 1px dashed #FF5A1F; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #FF5A1F;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #777;">This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Brevo Email Service] Failed to send email via Brevo API:', errorText);
        throw new Error('Failed to dispatch verification email');
      }

      logger.info(`[Brevo Email Service] Verification code successfully sent to ${email}`);
    } catch (error) {
      logger.error('[Brevo Email Service] Error connecting to Brevo:', error);
      throw error;
    }
  }
}
