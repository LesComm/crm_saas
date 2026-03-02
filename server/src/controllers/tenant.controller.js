/**
 * Tenant controller - HTTP handlers for tenant management (super_admin only)
 */

import * as tenantService from '../services/tenant.service.js';

export async function list(req, res, next) {
  try {
    const result = await tenantService.getAll(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const tenant = await tenantService.getById(req.params.id);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const tenant = await tenantService.create(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const tenant = await tenantService.update(req.params.id, req.body);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await tenantService.remove(req.params.id);
    res.json({ success: true, data: { message: 'Tenant deleted' } });
  } catch (err) {
    next(err);
  }
}
