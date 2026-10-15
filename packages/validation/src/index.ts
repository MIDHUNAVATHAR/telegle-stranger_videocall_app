import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address');

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'OTP must be exactly 6 digits');

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Display name must be at least 2 characters')
  .max(30, 'Display name must not exceed 30 characters');

export const ageSchema = z
  .number()
  .int('Age must be a whole number')
  .min(18, 'You must be at least 18 years old to use Donkey Play')
  .max(120, 'Invalid age');

export const genderSchema = z.enum([
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'PREFER_NOT_TO_SAY',
]);

export const matchFilterSchema = z.enum(['ANY', 'MALE', 'FEMALE']);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Wallet Schemas
export const createOrderSchema = z.object({
  packageId: z.string().trim().min(1, 'Package ID is required'),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().trim().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().trim().min(1, 'Razorpay signature is required'),
});

export const upiIdSchema = z
  .string()
  .trim()
  .min(3, 'UPI ID must be at least 3 characters')
  .max(50, 'UPI ID must not exceed 50 characters')
  .regex(/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID format (e.g. name@upi, user@okhdfcbank)');

export const updateUpiIdSchema = z.object({
  upiId: upiIdSchema,
});

export const withdrawRequestSchema = z.object({
  amountInr: z.number().min(1, 'Minimum withdrawal amount is ₹1').max(100000, 'Maximum withdrawal per request is ₹1,00,000').optional(),
  amountPaise: z.number().int().min(100, 'Minimum withdrawal is ₹1 (100 paise)').optional(),
  coins: z.number().int().min(1, 'Minimum withdrawal is 1 gift coin').optional(),
});

// Gift Schemas
export const sendGiftSchema = z.object({
  giftSlug: z.string().trim().min(1, 'Gift slug is required'),
  recipientUserId: z.string().trim().min(1, 'Recipient user ID is required'),
  matchSessionId: z.string().trim().optional(),
});

// Moderation Schemas
export const createReportSchema = z.object({
  targetUserId: z.string().trim().min(1, 'Target user ID is required'),
  matchSessionId: z.string().trim().optional(),
  reason: z.enum(['HARASSMENT', 'NUDITY_INAPPROPRIATE', 'UNDERAGE', 'SPAM', 'OTHER']),
  details: z.string().trim().max(500, 'Details cannot exceed 500 characters').optional(),
});

export const blockUserSchema = z.object({
  targetUserId: z.string().trim().min(1, 'Target user ID is required'),
});

