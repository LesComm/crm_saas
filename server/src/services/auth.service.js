/**
 * Auth service - Registration, login, JWT token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import * as tenantRepo from '../repositories/tenant.repo.js';
import * as userRepo from '../repositories/user.repo.js';
import * as refreshTokenRepo from '../repositories/refreshToken.repo.js';
import { AuthError, ConflictError, ValidationError } from '../shared/errors.js';
import { PLAN_LIMITS } from '../shared/constants.js';

const SALT_ROUNDS = 12;

/**
 * Register a new tenant + admin user
 */
export async function register({ email, password, firstName, lastName, tenantName, tenantSlug }) {
  // Check slug uniqueness
  const existingTenant = await tenantRepo.findBySlug(tenantSlug);
  if (existingTenant) {
    throw new ConflictError('Tenant slug already taken');
  }

  // Check email uniqueness across all tenants
  const existingUsers = await userRepo.findByEmailAcrossTenants(email);
  if (existingUsers.length > 0) {
    throw new ConflictError('Email already registered');
  }

  // Create tenant
  const tenant = await tenantRepo.create({
    name: tenantName,
    slug: tenantSlug,
    plan: 'free',
  });

  // Hash password and create admin user
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepo.create({
    tenantId: tenant.id,
    email,
    passwordHash,
    firstName,
    lastName,
    role: 'tenant_admin',
    language: 'fr',
  });

  // Generate tokens
  const tokens = await generateTokenPair(user, tenant.id);

  return {
    user,
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
    ...tokens,
  };
}

/**
 * Login with email + password
 */
export async function login({ email, password }) {
  // Find user across tenants
  const users = await userRepo.findByEmailAcrossTenants(email);
  if (users.length === 0) {
    throw new AuthError('Invalid email or password');
  }

  const user = users[0]; // Take first match

  if (!user.is_active) {
    throw new AuthError('Account is disabled');
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Invalid email or password');
  }

  // Update last login
  await userRepo.updateLastLogin(user.id);

  // Generate tokens
  const tokens = await generateTokenPair(user, user.tenant_id);

  return {
    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    },
    tenant: { id: user.tenant_id, name: user.tenant_name, slug: user.tenant_slug },
    ...tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokenRepo.findByHash(tokenHash);

  if (!stored) {
    throw new AuthError('Invalid or expired refresh token');
  }

  if (!stored.user_active) {
    throw new AuthError('Account is disabled');
  }

  // Revoke the used refresh token (rotation)
  await refreshTokenRepo.revoke(stored.id);

  // Generate new token pair
  const tokens = await generateTokenPair(
    { id: stored.user_id, role: stored.role, email: stored.email },
    stored.tenant_id
  );

  return tokens;
}

/**
 * Logout - revoke all refresh tokens for user
 */
export async function logout(userId) {
  await refreshTokenRepo.revokeAllForUser(userId);
}

// ── Internal helpers ─────────────────────────────

async function generateTokenPair(user, tenantId) {
  const payload = {
    userId: user.id,
    tenantId,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  // Generate random refresh token + store hash
  const refreshToken = randomBytes(40).toString('hex');
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await refreshTokenRepo.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
