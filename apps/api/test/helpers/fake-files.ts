import { Readable } from 'node:stream';
import { FileStorage } from '../../src/common/files/file-storage';
import { type ScanResult, VirusScanner } from '../../src/common/files/virus-scanner';

async function collect(body: Readable | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}

/** In-memory storage: tests can see exactly what was stored where. */
export class MemoryFileStorage extends FileStorage {
  readonly objects = new Map<string, Buffer>();

  async put(key: string, body: Readable | Buffer): Promise<void> {
    this.objects.set(key, await collect(body));
  }

  read(key: string): Promise<Readable> {
    const data = this.objects.get(key);
    if (!data) return Promise.reject(new Error(`No object ${key}`));
    return Promise.resolve(Readable.from([data]));
  }

  copy(fromKey: string, toKey: string): Promise<void> {
    const data = this.objects.get(fromKey);
    if (!data) return Promise.reject(new Error(`No object ${fromKey}`));
    this.objects.set(toKey, data);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  signedUrl(key: string, options: { expiresInSeconds: number; download?: string }) {
    const download = options.download ? `&download=${encodeURIComponent(options.download)}` : '';
    return Promise.resolve(
      `https://storage.test/${key}?expires=${options.expiresInSeconds}${download}`,
    );
  }
}

/** Flags any file containing "EICAR" (the standard antivirus test string). */
export class FakeVirusScanner extends VirusScanner {
  async scan(file: Readable): Promise<ScanResult> {
    const content = (await collect(file)).toString('utf8');
    return content.includes('EICAR')
      ? { clean: false, signature: 'Eicar-Test-Signature' }
      : { clean: true };
  }
}
