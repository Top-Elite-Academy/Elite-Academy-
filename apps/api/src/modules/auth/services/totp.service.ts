import { Injectable } from '@nestjs/common';
import { Secret, TOTP } from 'otpauth';
import QRCode from 'qrcode';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { AppConfig } from '../../../config/app-config';

/** RFC 6238 TOTP: 6 digits, 30-second steps, ±1 step tolerance for clock drift. */
@Injectable()
export class TotpService {
  constructor(
    private readonly config: AppConfig,
    private readonly crypto: CryptoService,
  ) {}

  /** A new secret, already encrypted for storage. */
  createEncryptedSecret(): string {
    return this.crypto.encrypt(new Secret({ size: 20 }).base32);
  }

  async enrolmentDetails(encryptedSecret: string, accountLabel: string) {
    const otpauthUrl = this.totp(encryptedSecret, accountLabel).toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });
    return { otpauthUrl, qrCodeDataUrl };
  }

  /**
   * Returns the time step the code belongs to, or null if invalid.
   * A code whose step is not after `lastUsedStep` is rejected, so it cannot be replayed.
   */
  verify(encryptedSecret: string, code: string, lastUsedStep: number | null): number | null {
    const totp = this.totp(encryptedSecret, 'verify');
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) return null;
    const step = totp.counter() + delta;
    return lastUsedStep !== null && step <= lastUsedStep ? null : step;
  }

  private totp(encryptedSecret: string, label: string): TOTP {
    return new TOTP({
      issuer: this.config.totpIssuer,
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(this.crypto.decrypt(encryptedSecret)),
    });
  }
}
