import type { Readable } from 'node:stream';

/**
 * Private file storage (spec §8: one small adapter per outside service).
 * Nothing in it is public: browsers only get short-lived signed links.
 * Keys are chosen by the API (never by the browser).
 */
export abstract class FileStorage {
  abstract put(
    key: string,
    body: Readable | Buffer,
    options: { size: number; contentType: string },
  ): Promise<void>;

  abstract read(key: string): Promise<Readable>;

  /** Copies within the bucket (e.g. quarantine → approved after a clean scan). */
  abstract copy(fromKey: string, toKey: string): Promise<void>;

  abstract delete(key: string): Promise<void>;

  /**
   * A link the browser can use for a few minutes. `download` sets the file name
   * the browser saves; without it the file is shown inline (videos).
   */
  abstract signedUrl(
    key: string,
    options: { expiresInSeconds: number; download?: string },
  ): Promise<string>;
}
