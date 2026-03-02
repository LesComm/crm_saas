/**
 * Tenant context middleware
 * Extracts tenant_id from JWT payload and attaches to req.tenantId
 * Ensures every downstream query is scoped to the correct tenant
 */

import { AuthError } from '../shared/errors.js';

export function tenantContext(req, _res, next) {
  if (!req.user || !req.user.tenantId) {
    return next(new AuthError('No tenant context in token'));
  }

  req.tenantId = req.user.tenantId;
  next();
}
