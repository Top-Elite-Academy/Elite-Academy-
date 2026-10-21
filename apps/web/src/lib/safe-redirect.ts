/**
 * Open-redirect protection (spec §9.3): after sign-in we only go to an internal
 * path such as "/app". Anything else ("//evil.com", "https://…", "/\evil") falls back.
 */
export function safeRedirectPath(target: string | null | undefined, fallback: string): string {
  if (!target || target.length > 512) return fallback;
  const isInternalPath =
    target.startsWith('/') && !target.startsWith('//') && !target.includes('\\');
  return isInternalPath && !hasControlCharacter(target) ? target : fallback;
}

/** Newlines and other control characters could be used for header injection. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}
