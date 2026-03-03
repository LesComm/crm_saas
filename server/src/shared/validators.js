/**
 * Reusable Zod schemas for request validation
 */

import { z } from 'zod';

// Common field schemas
export const uuidParam = z.string().uuid();

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be lowercase alphanumeric with hyphens');

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantName: z.string().min(2).max(200),
  tenantSlug: slugSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// Tenant schemas
export const createTenantSchema = z.object({
  name: z.string().min(2).max(200),
  slug: slugSchema,
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free'),
  maxUsers: z.number().int().min(1).optional(),
  maxConversationsPerMonth: z.number().int().min(1).optional(),
});

// CRM credential schemas
const credentialBase = {
  label: z.string().min(1).max(200).default('Production'),
  crmType: z.enum(['perfex']).default('perfex'),
  isPrimary: z.boolean().default(true),
};

export const createCredentialSchema = z.discriminatedUnion('connectionMode', [
  z.object({
    ...credentialBase,
    connectionMode: z.literal('api'),
    baseUrl: z.string().url().max(500),
    apiToken: z.string().min(1),
  }),
  z.object({
    ...credentialBase,
    connectionMode: z.literal('mysql'),
    mysqlHost: z.string().min(1).max(500),
    mysqlPort: z.coerce.number().int().min(1).max(65535).default(3306),
    mysqlUser: z.string().min(1).max(200),
    mysqlPassword: z.string().min(1),
    mysqlDatabase: z.string().min(1).max(200),
  }),
]);

// Conversation schemas
export const createConversationSchema = z.object({
  title: z.string().max(300).optional(),
  metadata: z.record(z.unknown()).default({}),
});

// Message schemas
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  inputType: z.enum(['text', 'voice']).default('text'),
});
