/**
 * JWT authentication middleware
 * Verifies Bearer token and attaches decoded payload to req.user
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError } from '../shared/errors.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AuthError('Missing or invalid Authorization header'));
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // { userId, tenantId, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AuthError('Token expired'));
    }
    next(new AuthError('Invalid token'));
  }
}

/**
 * Role-based authorization middleware factory
 * @param  {...string} allowedRoles
 */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthError('Insufficient permissions'));
    }
    next();
  };
}
