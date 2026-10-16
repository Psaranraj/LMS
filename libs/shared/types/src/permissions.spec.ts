import { describe, expect, it } from 'vitest';
import { PERMISSION_KEYS } from './permissions.js';

describe('permission catalogue', () => {
  it('has unique keys in resource.action form', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
    for (const key of PERMISSION_KEYS) expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/);
  });
});
