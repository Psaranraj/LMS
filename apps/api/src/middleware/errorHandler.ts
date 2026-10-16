import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.status >= 500) req.log?.error({ err }, err.message);
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  req.log?.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
