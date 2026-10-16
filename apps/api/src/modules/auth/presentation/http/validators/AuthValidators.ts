import { z } from 'zod';
import { emailSchema, otpCodeSchema } from '@donkey-play/validation';

export const sendOtpSchema = {
  body: z.object({
    email: emailSchema,
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    email: emailSchema,
    code: otpCodeSchema,
    referral_code: z.string().optional(),
    referralCode: z.string().optional(),
  }),
};

export const googleAuthSchema = {
  body: z.object({
    id_token: z.string().min(10, 'Google ID token must be at least 10 characters'),
    referral_code: z.string().optional(),
    referralCode: z.string().optional(),
  }),
};
