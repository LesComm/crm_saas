/**
 * Centralized error handler middleware
 * Maps custom AppError subclasses to proper HTTP responses
 */

import { AppError } from '../shared/errors.js';
import { env } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  // Zod validation errors (from validation middleware)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  // Custom application errors
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: err.message,
      code: err.code,
    };

    if (err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unexpected errors
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}
