import type { Readable } from 'node:stream';

export type ScanResult = { clean: true } | { clean: false; signature: string };

/** Checks uploaded files before anyone can download them (spec §9). */
export abstract class VirusScanner {
  abstract scan(file: Readable): Promise<ScanResult>;
}
