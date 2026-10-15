import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/donkey_play'),
  MONGODB_DEBUG: z.coerce.boolean().default(false),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().default(0),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173'),
  JWT_ACCESS_SECRET: z.string().default('donkey_play_dev_jwt_access_secret_32_chars_min'),
  JWT_REFRESH_SECRET: z.string().default('donkey_play_dev_jwt_refresh_secret_32_chars_min'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BREVO_API_KEY: z.string().optional().default(''),
  BREVO_SENDER_EMAIL: z.string().default('otp@donkeyplay.com'),
  BREVO_SENDER_NAME: z.string().default('Donkey Play Verification'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  MATCH_COIN_PRICE: z.coerce.number().default(1),
  MIN_CALL_DURATION_SECONDS: z.coerce.number().default(5),
  REPORTS_BAN_THRESHOLD: z.coerce.number().default(5),
  REPORTS_BAN_WINDOW_SECONDS: z.coerce.number().default(3600),
  BAN_DURATION_SECONDS: z.coerce.number().default(86400),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const env: EnvConfig = envSchema.parse(process.env);
