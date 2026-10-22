import { connect, type Socket } from 'node:net';
import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';
import { type ScanResult, VirusScanner } from './virus-scanner';

const TIMEOUT_MS = 120_000;
const MAX_CHUNK = 64 * 1024;

/**
 * ClamAV over its network protocol (clamd INSTREAM): the file is sent in
 * length-prefixed chunks, then clamd answers "stream: OK" or
 * "stream: <signature> FOUND". Small enough not to need a library.
 */
@Injectable()
export class ClamavScanner extends VirusScanner {
  constructor(private readonly config: AppConfig) {
    super();
  }

  scan(file: Readable): Promise<ScanResult> {
    const { host, port } = this.config.clamav;
    return scanWithClamd(file, host, port);
  }
}

export function scanWithClamd(file: Readable, host: string, port: number): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const socket: Socket = connect({ host, port });
    let answer = '';
    const fail = (error: Error) => {
      socket.destroy();
      file.destroy();
      reject(error);
    };
    socket.setTimeout(TIMEOUT_MS, () => {
      fail(new Error('ClamAV did not answer in time'));
    });
    socket.on('error', fail);
    socket.on('data', (data: Buffer) => {
      answer += data.toString('utf8');
    });
    socket.on('end', () => {
      const reply = answer.replace(/\0/g, '').trim();
      if (reply.endsWith('OK')) resolve({ clean: true });
      else if (reply.endsWith('FOUND'))
        resolve({
          clean: false,
          signature: reply.replace(/^stream:\s*/, '').replace(/\s*FOUND$/, ''),
        });
      else reject(new Error(`ClamAV could not scan the file: ${reply || 'no answer'}`));
    });

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      file.on('data', (chunk: Buffer) => {
        for (let offset = 0; offset < chunk.length; offset += MAX_CHUNK) {
          const part = chunk.subarray(offset, offset + MAX_CHUNK);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(part.length);
          socket.write(Buffer.concat([size, part]));
        }
      });
      file.on('end', () => socket.write(Buffer.alloc(4)));
      file.on('error', fail);
    });
  });
}
