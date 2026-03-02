/**
 * Application-wide constants
 */

// User roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  USER: 'user',
};

// Tenant plans
export const PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

// Plan limits
export const PLAN_LIMITS = {
  free: { maxUsers: 1, maxConversationsPerMonth: 50 },
  starter: { maxUsers: 3, maxConversationsPerMonth: 300 },
  pro: { maxUsers: 10, maxConversationsPerMonth: 1000 },
  enterprise: { maxUsers: 50, maxConversationsPerMonth: 10000 },
};

// Conversation statuses
export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
};

// AI config statuses
export const AI_CONFIG_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

// CRM connection statuses
export const CONNECTION_STATUS = {
  UNTESTED: 'untested',
  CONNECTED: 'connected',
  FAILED: 'failed',
};

// Message roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
};

// Input types
export const INPUT_TYPES = {
  TEXT: 'text',
  VOICE: 'voice',
};
