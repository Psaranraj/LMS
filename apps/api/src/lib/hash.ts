import { createHash } from 'node:crypto';

/** Fast, non-secret hash used only to look up high-entropy tokens (refresh tokens) by value. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
