import type { Locale, Role } from '@eta/shared';

/** The signed-in user as seen by guards and controllers. Never contains secrets. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  locale: Locale;
  timeZone: string;
  totpEnabled: boolean;
}

export interface AuthContext {
  sessionId: string;
  mfaVerified: boolean;
  user: AuthUser;
}

/** Adds `request.auth`, set by SessionGuard. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the official way to extend Express types
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
