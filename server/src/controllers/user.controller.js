/**
 * User controller - Manage users within a tenant (tenant_admin or super_admin)
 */

import * as userRepo from '../repositories/user.repo.js';
import bcrypt from 'bcrypt';
import { NotFoundError } from '../shared/errors.js';

const SALT_ROUNDS = 12;

export async function list(req, res, next) {
  try {
    const tenantId = req.params.tenantId || req.tenantId;
    const users = await userRepo.findAllByTenant(tenantId, req.query);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user) throw new NotFoundError('User');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const tenantId = req.params.tenantId || req.tenantId;
    const { email, password, firstName, lastName, role } = req.body;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepo.create({
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
      role: role || 'user',
      language: 'fr',
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const tenantId = req.params.tenantId || req.tenantId;
    const fields = { ...req.body };
    if (fields.password) {
      fields.password_hash = await bcrypt.hash(fields.password, SALT_ROUNDS);
      delete fields.password;
    }
    const user = await userRepo.update(req.params.id, tenantId, fields);
    if (!user) throw new NotFoundError('User');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const tenantId = req.params.tenantId || req.tenantId;
    const deleted = await userRepo.remove(req.params.id, tenantId);
    if (!deleted) throw new NotFoundError('User');
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    next(err);
  }
}
