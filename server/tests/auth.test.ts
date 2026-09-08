import { describe, expect, it } from 'vitest';
import { createAccessToken, readAccessToken } from '../src/services/tokens.js';

describe('access tokens', () => {
  it('round-trips the identity and role references', () => {
    const token = createAccessToken({ id: 'user-1', email: 'admin@sapienza.test', roleIds: [] });
    expect(readAccessToken(token)).toMatchObject({ id: 'user-1', email: 'admin@sapienza.test', roleIds: [] });
  });

  it('rejects a tampered token', () => {
    expect(() => readAccessToken('tampered-token')).toThrow();
  });
});
