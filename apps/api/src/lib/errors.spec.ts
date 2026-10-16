import { describe, expect, it } from 'vitest';
import { ForbiddenError, UnauthorizedError } from './errors.js';

describe('app errors', () => {
  it('carry the right status and code', () => {
    expect(new UnauthorizedError().status).toBe(401);
    expect(new ForbiddenError().code).toBe('FORBIDDEN');
  });
});
