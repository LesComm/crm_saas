/**
 * CRM controller - HTTP handlers for CRM credentials
 */

import * as crmService from '../services/crm.service.js';

export async function list(req, res, next) {
  try {
    const credentials = await crmService.getAll(req.tenantId);
    res.json({ success: true, data: credentials });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const credential = await crmService.getById(req.params.id, req.tenantId);
    res.json({ success: true, data: credential });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const credential = await crmService.create(req.tenantId, req.body);
    res.status(201).json({ success: true, data: credential });
  } catch (err) {
    next(err);
  }
}

export async function testConnection(req, res, next) {
  try {
    const credential = await crmService.testConnection(req.params.id, req.tenantId);
    res.json({ success: true, data: credential });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await crmService.remove(req.params.id, req.tenantId);
    res.json({ success: true, data: { message: 'Credential deleted' } });
  } catch (err) {
    next(err);
  }
}
