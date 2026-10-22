import type { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';
import { FileStorage } from './file-storage';

/** RFC 6266 file name for Content-Disposition, safe for any language. */
function attachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** S3-compatible storage: Cloudflare R2, AWS S3, or the development storage service. */
@Injectable()
export class S3FileStorage extends FileStorage implements OnModuleInit {
  private readonly logger = new Logger(S3FileStorage.name);
  private readonly client: S3Client;
  /** Signs links with the address browsers can reach. */
  private readonly signer: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: AppConfig) {
    super();
    const settings = config.storage;
    const base = {
      region: settings.region,
      forcePathStyle: settings.forcePathStyle,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
      },
    };
    this.client = new S3Client({ ...base, endpoint: settings.endpoint });
    this.signer = new S3Client({ ...base, endpoint: settings.publicEndpoint });
    this.bucket = settings.bucket;
  }

  /** Development convenience: creates the bucket if it is missing. */
  async onModuleInit(): Promise<void> {
    if (!this.config.storage.createBucket) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket ${this.bucket}`);
      } catch (error) {
        this.logger.warn(`Storage is not reachable yet: ${String(error)}`);
      }
    }
  }

  async put(
    key: string,
    body: Readable | Buffer,
    options: { size: number; contentType: string },
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentLength: options.size,
        ContentType: options.contentType,
      }),
    );
  }

  async read(key: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return result.Body as Readable;
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${fromKey}`,
        Key: toKey,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  signedUrl(key: string, options: { expiresInSeconds: number; download?: string }) {
    return getSignedUrl(
      this.signer,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(options.download ? { ResponseContentDisposition: attachment(options.download) } : {}),
      }),
      { expiresIn: options.expiresInSeconds },
    );
  }
}
