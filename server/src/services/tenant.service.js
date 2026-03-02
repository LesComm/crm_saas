/**
 * Tenant service - Business logic for tenant management
 */

import * as tenantRepo from '../repositories/tenant.repo.js';
import { NotFoundError, ConflictError } from '../shared/errors.js';

export async function getAll({ limit, offset } = {}) {
  const [tenants, total] = await Promise.all([
    tenantRepo.findAll({ limit, offset }),
    tenantRepo.count(),
  ]);
  return { tenants, total };
}

export async function getById(id) {
  const tenant = await tenantRepo.findById(id);
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}

export async function create(data) {
  const existing = await tenantRepo.findBySlug(data.slug);
  if (existing) throw new ConflictError('Tenant slug already taken');
  return tenantRepo.create(data);
}

export async function update(id, fields) {
  const tenant = await tenantRepo.update(id, fields);
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}

export async function remove(id) {
  const deleted = await tenantRepo.remove(id);
  if (!deleted) throw new NotFoundError('Tenant');
}
