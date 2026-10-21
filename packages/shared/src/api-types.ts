import type { Locale } from './locales';
import type { Role } from './roles';

/** What the API returns for the signed-in user. Never includes secrets or hashes. */
export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  locale: Locale;
  timeZone: string;
  totpEnabled: boolean;
}

/** Result of a sign-in step. The web app moves to the next screen based on `next`. */
export interface LoginResponse {
  next: 'done' | 'totp_verify' | 'totp_setup';
}

export interface TotpSetupResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

/** Uniform error body for every API error. `code` is a translation key. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  fieldErrors?: Record<string, string[]>;
  captchaRequired?: boolean;
}
