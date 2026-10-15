import { RedisOtpService } from '../../infrastructure/services/RedisOtpService';
import { EmailService, BrevoEmailService } from '../../infrastructure/services/BrevoEmailService';
import { emailSchema } from '@donkey-play/validation';

export interface SendOtpInput {
  email: string;
  ip: string;
}

export interface SendOtpOutput {
  message: string;
  expiresIn: number;
}

export class SendOtpUseCase {
  constructor(
    private readonly otpService: RedisOtpService = new RedisOtpService(),
    private readonly emailService: EmailService = new BrevoEmailService()
  ) {}

  public async execute(input: SendOtpInput): Promise<SendOtpOutput> {
    const validatedEmail = emailSchema.parse(input.email);

    // Generate and store OTP in Redis with 60s cooldown and 10/hr IP limit
    const rawOtp = await this.otpService.generateAndStoreOtp(validatedEmail, input.ip);

    // Send via Brevo
    await this.emailService.sendOtpEmail(validatedEmail, rawOtp);

    return {
      message: 'Verification OTP sent to email',
      expiresIn: 300,
    };
  }
}
