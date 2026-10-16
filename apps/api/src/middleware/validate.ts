import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationAppError } from '../lib/errors.js';

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ValidationAppError(result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ValidationAppError(result.error.flatten()));
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
