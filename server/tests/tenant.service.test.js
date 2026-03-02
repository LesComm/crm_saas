/**
 * Tests for tenant service
 */

import './setup.js';
import { jest } from '@jest/globals';

const mockTenantRepo = {
  findAll: jest.fn(),
  count: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/tenant.repo.js', () => mockTenantRepo);

const tenantService = await import('../src/services/tenant.service.js');

const TENANT = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Corp',
  slug: 'test-corp',
  plan: 'free',
  is_active: true,
};

describe('Tenant Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return tenants and total count', async () => {
      mockTenantRepo.findAll.mockResolvedValue([TENANT]);
      mockTenantRepo.count.mockResolvedValue(1);

      const result = await tenantService.getAll({ limit: 20, offset: 0 });

      expect(result.tenants).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('should return a tenant by id', async () => {
      mockTenantRepo.findById.mockResolvedValue(TENANT);

      const result = await tenantService.getById(TENANT.id);

      expect(result.slug).toBe('test-corp');
    });

    it('should throw NotFoundError for unknown id', async () => {
      mockTenantRepo.findById.mockResolvedValue(null);

      await expect(
        tenantService.getById('unknown-id')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(null);
      mockTenantRepo.create.mockResolvedValue(TENANT);

      const result = await tenantService.create({
        name: 'Test Corp',
        slug: 'test-corp',
      });

      expect(result.name).toBe('Test Corp');
    });

    it('should throw ConflictError if slug exists', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(TENANT);

      await expect(
        tenantService.create({ name: 'Another', slug: 'test-corp' })
      ).rejects.toThrow('Tenant slug already taken');
    });
  });

  describe('update', () => {
    it('should update tenant fields', async () => {
      const updated = { ...TENANT, name: 'Updated Corp' };
      mockTenantRepo.update.mockResolvedValue(updated);

      const result = await tenantService.update(TENANT.id, { name: 'Updated Corp' });

      expect(result.name).toBe('Updated Corp');
    });

    it('should throw NotFoundError for unknown id', async () => {
      mockTenantRepo.update.mockResolvedValue(null);

      await expect(
        tenantService.update('unknown-id', { name: 'X' })
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('remove', () => {
    it('should delete a tenant', async () => {
      mockTenantRepo.remove.mockResolvedValue(true);

      await expect(tenantService.remove(TENANT.id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError for unknown id', async () => {
      mockTenantRepo.remove.mockResolvedValue(false);

      await expect(
        tenantService.remove('unknown-id')
      ).rejects.toThrow('Tenant not found');
    });
  });
});
