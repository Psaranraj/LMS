import type { Request } from 'express';
import { ValidationAppError } from './errors.js';

/** Reads a numeric URL parameter such as /courses/:id. */
export function idParam(req: Request, name = 'id'): number {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationAppError({ [name]: ['Invalid id'] });
  return n;
}

/** The logged-in user id from the verified token (authenticate middleware runs first). */
export function me(req: Request): number {
  return req.user!.sub;
}
