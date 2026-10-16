import { describe, expect, it } from 'vitest';
import { PERMISSION_KEYS } from '@lms/shared-types';
import { SYSTEM_ROLE_DEFAULT_GRANTS } from './rbac-defaults.js';

describe('default role grants', () => {
  it('only reference keys that exist in the catalogue', () => {
    for (const grants of Object.values(SYSTEM_ROLE_DEFAULT_GRANTS)) {
      if (grants === 'ALL') continue;
      for (const key of grants) expect(PERMISSION_KEYS).toContain(key);
    }
  });
});
