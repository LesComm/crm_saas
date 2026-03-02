/**
 * Tests for auth service
 */

import './setup.js';
import { jest } from '@jest/globals';

// Mock repositories
const mockTenantRepo = {
  findBySlug: jest.fn(),
  create: jest.fn(),
};

const mockUserRepo = {
  findByEmailAcrossTenants: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
};

const mockRefreshTokenRepo = {
  create: jest.fn(),
  findByHash: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/tenant.repo.js', () => mockTenantRepo);
jest.unstable_mockModule('../src/repositories/user.repo.js', () => mockUserRepo);
jest.unstable_mockModule('../src/repositories/refreshToken.repo.js', () => mockRefreshTokenRepo);

const authService = await import('../src/services/auth.service.js');

// ── Test data ────────────────────────────────
const TENANT = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Corp',
  slug: 'test-corp',
  plan: 'free',
};

const USER = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  tenant_id: TENANT.id,
  email: 'admin@test.com',
  first_name: 'Jean',
  last_name: 'Test',
  role: 'tenant_admin',
  is_active: true,
  password_hash: '$2b$12$LJ3m4ys4Sz8DqRdNE.LlouX9Lp0YP3Kvh3h8D0GMs9pCGH2YOiPi', // "Password1!"
  tenant_slug: 'test-corp',
  tenant_name: 'Test Corp',
};

// ── Tests ─────────────────────────────────────
describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new tenant and admin user', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(null);
      mockUserRepo.findByEmailAcrossTenants.mockResolvedValue([]);
      mockTenantRepo.create.mockResolvedValue(TENANT);
      mockUserRepo.create.mockResolvedValue(USER);
      mockRefreshTokenRepo.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'admin@test.com',
        password: 'Password1!',
        firstName: 'Jean',
        lastName: 'Test',
        tenantName: 'Test Corp',
        tenantSlug: 'test-corp',
      });

      expect(result.user).toBeDefined();
      expect(result.tenant.slug).toBe('test-corp');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockTenantRepo.create).toHaveBeenCalledWith({
        name: 'Test Corp',
        slug: 'test-corp',
        plan: 'free',
      });
    });

    it('should throw ConflictError if slug already taken', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(TENANT);

      await expect(
        authService.register({
          email: 'admin@test.com',
          password: 'Password1!',
          firstName: 'Jean',
          lastName: 'Test',
          tenantName: 'Test Corp',
          tenantSlug: 'test-corp',
        })
      ).rejects.toThrow('Tenant slug already taken');
    });

    it('should throw ConflictError if email already exists', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(null);
      mockUserRepo.findByEmailAcrossTenants.mockResolvedValue([USER]);

      await expect(
        authService.register({
          email: 'admin@test.com',
          password: 'Password1!',
          firstName: 'Jean',
          lastName: 'Test',
          tenantName: 'Test Corp 2',
          tenantSlug: 'test-corp-2',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should throw AuthError for unknown email', async () => {
      mockUserRepo.findByEmailAcrossTenants.mockResolvedValue([]);

      await expect(
        authService.login({ email: 'unknown@test.com', password: 'Password1!' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw AuthError for disabled account', async () => {
      mockUserRepo.findByEmailAcrossTenants.mockResolvedValue([
        { ...USER, is_active: false },
      ]);

      await expect(
        authService.login({ email: 'admin@test.com', password: 'Password1!' })
      ).rejects.toThrow('Account is disabled');
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens for the user', async () => {
      mockRefreshTokenRepo.revokeAllForUser.mockResolvedValue();

      await authService.logout(USER.id);

      expect(mockRefreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith(USER.id);
    });
  });

  describe('refresh', () => {
    it('should throw AuthError for invalid token', async () => {
      mockRefreshTokenRepo.findByHash.mockResolvedValue(null);

      await expect(
        authService.refresh('invalid-token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw AuthError for disabled user', async () => {
      mockRefreshTokenRepo.findByHash.mockResolvedValue({
        id: '1',
        user_id: USER.id,
        user_active: false,
        role: 'tenant_admin',
        email: 'admin@test.com',
        tenant_id: TENANT.id,
      });

      await expect(
        authService.refresh('some-token')
      ).rejects.toThrow('Account is disabled');
    });
  });
});
