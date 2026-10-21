import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';

const CIPHER = 'aes-256-gcm';
const IV_BYTES = 12;
const VERSION = 'v1';

/** Small, audited set of crypto helpers. Nothing else in the API touches node:crypto. */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: AppConfig) {
    this.key = config.encryptionKey;
  }

  /** 32 random bytes, base64url (43 chars). Used for session ids and single-use links. */
  randomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /** Tokens are stored only as SHA-256 hashes, so a database leak does not leak live tokens. */
  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  /** Field-level encryption (spec §9.7), output: "v1.<iv>.<tag>.<ciphertext>" in base64url. */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(CIPHER, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv, tag, ciphertext]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, ciphertext] = payload.split('.');
    if (version !== VERSION || !iv || !tag || !ciphertext) {
      throw new Error('Unsupported encrypted payload');
    }
    const decipher = createDecipheriv(CIPHER, this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
