/**
 * Environment variable validation and export
 * Validates all required env vars at startup using Zod
 */

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // PostgreSQL
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Encryption (64 hex chars = 32 bytes)
  ENCRYPTION_MASTER_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'Must be 64 hex characters (32 bytes)'),

  // Ollama
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3:8b-instruct-q4_K_M'),

  // ElevenLabs (optional)
  ELEVENLABS_API_KEY: z.string().optional().default(''),
  ELEVENLABS_VOICE_ID: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
