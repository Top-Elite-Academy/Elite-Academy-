const SECRET_KEY_PATTERN = /password|secret|token|hash|totp|otp|cookie|authorization/i;
const REDACTED = '[redacted]';

/** Deep copy with every secret-looking field replaced, so audit logs never hold secrets (spec §7). */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? REDACTED : redactSecrets(inner),
      ]),
    );
  }
  return value;
}
