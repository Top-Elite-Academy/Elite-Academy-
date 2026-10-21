import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { outboundFetch } from '../../../common/http/outbound-fetch';
import { AppConfig } from '../../../config/app-config';

/**
 * Have I Been Pwned "range" API with k-anonymity: only the first 5 characters
 * of the SHA-1 hash leave the server; the password itself never does.
 */
@Injectable()
export class BreachedPasswordService {
  private readonly logger = new Logger(BreachedPasswordService.name);

  constructor(private readonly config: AppConfig) {}

  async isBreached(password: string): Promise<boolean> {
    if (!this.config.hibpEnabled) return false;

    // SHA-1 is required by the HIBP protocol; it is not used for storing passwords.
    const digest = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);

    try {
      const response = await outboundFetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseRange(await response.text()).has(suffix);
    } catch (error) {
      // Fail open: an outage at HIBP must not block every password change. Length rules still apply.
      this.logger.warn(`Breached-password check unavailable: ${String(error)}`);
      return false;
    }
  }
}

/** Lines look like "SUFFIX:COUNT"; padded entries have count 0 and are ignored. */
function parseRange(body: string): Set<string> {
  const found = new Set<string>();
  for (const line of body.split('\n')) {
    const [suffix, count] = line.trim().split(':');
    if (suffix && Number(count) > 0) found.add(suffix);
  }
  return found;
}
