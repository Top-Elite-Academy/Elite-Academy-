import { createServer, type Server } from 'node:net';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { scanWithClamd } from './clamav-scanner';

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR';

/** A tiny stand-in for clamd: reads INSTREAM chunks, answers like ClamAV. */
function fakeClamd(): Promise<{ server: Server; port: number; received: () => string }> {
  let body = Buffer.alloc(0);
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      const command = 'zINSTREAM\0';
      if (buffer.subarray(0, command.length).toString() === command)
        buffer = buffer.subarray(command.length);
      while (buffer.length >= 4) {
        const size = buffer.readUInt32BE(0);
        if (size === 0) {
          socket.end(
            body.toString().includes('EICAR')
              ? 'stream: Eicar-Test-Signature FOUND\0'
              : 'stream: OK\0',
          );
          return;
        }
        if (buffer.length < 4 + size) return;
        body = Buffer.concat([body, buffer.subarray(4, 4 + size)]);
        buffer = buffer.subarray(4 + size);
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        port: typeof address === 'object' && address ? address.port : 0,
        received: () => body.toString(),
      });
    });
  });
}

let running: Server | null = null;
afterEach(() => {
  running?.close();
  running = null;
});

describe('scanWithClamd', () => {
  it('sends the whole file in chunks and reports a clean file', async () => {
    const clamd = await fakeClamd();
    running = clamd.server;
    const content = 'a'.repeat(200_000);
    await expect(
      scanWithClamd(Readable.from([Buffer.from(content)]), '127.0.0.1', clamd.port),
    ).resolves.toEqual({
      clean: true,
    });
    expect(clamd.received()).toBe(content);
  });

  it('reports the signature of an infected file', async () => {
    const clamd = await fakeClamd();
    running = clamd.server;
    await expect(
      scanWithClamd(Readable.from([Buffer.from(EICAR)]), '127.0.0.1', clamd.port),
    ).resolves.toEqual({
      clean: false,
      signature: 'Eicar-Test-Signature',
    });
  });

  it('fails when ClamAV cannot be reached', async () => {
    await expect(
      scanWithClamd(Readable.from([Buffer.from('x')]), '127.0.0.1', 1),
    ).rejects.toThrow();
  });
});
