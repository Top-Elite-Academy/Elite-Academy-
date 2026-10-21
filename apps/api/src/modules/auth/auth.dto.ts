import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  totpVerifySchema,
} from '@eta/shared';
import { createZodDto } from 'nestjs-zod';

// DTO classes wrap the shared Zod schemas: validation + OpenAPI docs from one definition.
export class LoginDto extends createZodDto(loginSchema) {}
export class TotpCodeDto extends createZodDto(totpVerifySchema) {}
export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
export class SignupDto extends createZodDto(signupSchema) {}
