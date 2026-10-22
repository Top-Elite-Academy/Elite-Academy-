import { Global, Module } from '@nestjs/common';
import { ClamavScanner } from './clamav-scanner';
import { FileStorage } from './file-storage';
import { S3FileStorage } from './s3-file-storage';
import { VirusScanner } from './virus-scanner';

/** File storage and virus scanning for every module (tests swap in fakes). */
@Global()
@Module({
  providers: [
    { provide: FileStorage, useClass: S3FileStorage },
    { provide: VirusScanner, useClass: ClamavScanner },
  ],
  exports: [FileStorage, VirusScanner],
})
export class FilesModule {}
