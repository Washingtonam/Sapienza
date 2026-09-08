import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
   CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
   PAYMENT_WEBHOOK_SECRET: z.string().min(32)
});

export const env = envSchema.parse(process.env);
