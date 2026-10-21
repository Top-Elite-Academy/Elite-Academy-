import { describe, expect, it } from 'vitest';
import { redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('replaces secret fields at any depth and keeps the rest', () => {
    const input = {
      email: 'a@b.co',
      passwordHash: '$argon2id$...',
      nested: { totpSecretEnc: 'v1.x', roles: ['admin'] },
      list: [{ resetToken: 'abc', ok: 1 }],
    };
    expect(redactSecrets(input)).toEqual({
      email: 'a@b.co',
      passwordHash: '[redacted]',
      nested: { totpSecretEnc: '[redacted]', roles: ['admin'] },
      list: [{ resetToken: '[redacted]', ok: 1 }],
    });
  });

  it('serialises dates', () => {
    expect(redactSecrets({ at: new Date('2026-01-01T00:00:00Z') })).toEqual({
      at: '2026-01-01T00:00:00.000Z',
    });
  });
});
