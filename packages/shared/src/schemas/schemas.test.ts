import { describe, expect, it } from 'vitest';
import { loginSchema, resetPasswordSchema, totpCodeSchema } from './auth';
import { createInvitationSchema, personNameSchema, updateMyPreferencesSchema } from './user';

describe('auth schemas', () => {
  it('normalises the email to lower case', () => {
    const parsed = loginSchema.parse({ email: '  Dania@Example.COM ', password: 'x' });
    expect(parsed.email).toBe('dania@example.com');
  });

  it('rejects a password shorter than 10 characters with a translation key', () => {
    const result = resetPasswordSchema.safeParse({ token: 'a'.repeat(43), password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('password.tooShort');
  });

  it('accepts only 6-digit TOTP codes', () => {
    expect(totpCodeSchema.safeParse('123456').success).toBe(true);
    expect(totpCodeSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('user schemas', () => {
  it.each(['Dania', 'دانية', 'דניה', "O'Neil", 'Al-Sayed'])('accepts the name %s', (name) => {
    expect(personNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(['D', '<script>', 'Dan1a', '  '])('rejects the name %s', (name) => {
    expect(personNameSchema.safeParse(name).success).toBe(false);
  });

  it('deduplicates invited roles', () => {
    const parsed = createInvitationSchema.parse({
      email: 'a@b.co',
      firstName: 'Rana',
      lastName: 'Arafat',
      roles: ['sales', 'sales', 'instructor'],
    });
    expect(parsed.roles).toEqual(['sales', 'instructor']);
  });

  it('refuses fields a user may not change on their own account (mass assignment)', () => {
    const result = updateMyPreferencesSchema.safeParse({ locale: 'ar', roles: ['admin'] });
    expect(result.success).toBe(false);
  });

  it('validates IANA time zones', () => {
    expect(updateMyPreferencesSchema.safeParse({ timeZone: 'Asia/Jerusalem' }).success).toBe(true);
    expect(updateMyPreferencesSchema.safeParse({ timeZone: 'Mars/Olympus' }).success).toBe(false);
  });
});
