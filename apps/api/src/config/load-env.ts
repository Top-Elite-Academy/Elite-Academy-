import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

/**
 * Loads the monorepo's root .env for local development. Values already set in
 * the real environment (CI, hosting secrets manager) always win.
 */
export function loadEnvFile(): void {
  const file = path.resolve(__dirname, '../../../../.env');
  if (existsSync(file)) {
    config({ path: file, quiet: true });
  }
}
