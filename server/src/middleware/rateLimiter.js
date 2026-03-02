/**
 * Simple in-memory rate limiter per tenant
 * Production should use Redis, but this works for dev/single-instance
 */

import { AppError } from '../shared/errors.js';

const windows = new Map();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per window per tenant

export function rateLimiter(req, _res, next) {
  const tenantId = req.tenantId || 'anonymous';
  const now = Date.now();

  let entry = windows.get(tenantId);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    windows.set(tenantId, entry);
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return next(new AppError('Rate limit exceeded', 429, 'RATE_LIMITED'));
  }

  next();
}
