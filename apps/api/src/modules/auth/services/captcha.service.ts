import { Injectable, Logger } from '@nestjs/common';
import { outboundFetch } from '../../../common/http/outbound-fetch';
import { AppConfig } from '../../../config/app-config';

/** Cloudflare Turnstile verification. Always checked on the server (spec §8, §9.4). */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private readonly config: AppConfig) {}

  async verify(token: string | undefined, ip: string): Promise<boolean> {
    if (!token) return false;
    try {
      const response = await outboundFetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: new URLSearchParams({
            secret: this.config.captchaSecret,
            response: token,
            remoteip: ip,
          }),
        },
      );
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch (error) {
      // Fail closed: if the captcha cannot be verified, the request is refused.
      this.logger.warn(`Captcha verification failed: ${String(error)}`);
      return false;
    }
  }
}
