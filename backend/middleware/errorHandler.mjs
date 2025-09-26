import { isProduction } from '../config/env.mjs';

export function notFoundHandler(req, res, next) {
  res.status(404).json({ status: 'error', message: 'Not Found' });
}

export function errorHandler(err, req, res, next) {
  const statusCode = typeof err.status === 'number' ? err.status : 500;
  const message = err.message || 'Internal Server Error';

  if (!isProduction) {
    // In non-production, include stack for debugging
    return res.status(statusCode).json({ status: 'error', message, stack: err.stack });
  }

  return res.status(statusCode).json({ status: 'error', message });
}

