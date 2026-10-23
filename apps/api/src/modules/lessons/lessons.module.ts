import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';
import { FileScanProcessor } from './file-scan.processor';
import { FileScanService } from './file-scan.service';
import { FILE_SCAN_QUEUE, LessonFilesService } from './lesson-files.service';
import { LessonVideosService } from './lesson-videos.service';
import { MyLessonsController } from './my-lessons.controller';
import { StudentLessonsService } from './student-lessons.service';
import { TeachLessonsController } from './teach-lessons.controller';
import { TeachLessonsService } from './teach-lessons.service';
import { CloudflareStreamProvider } from './video/cloudflare-stream.provider';
import { LocalVideoProvider } from './video/local-video.provider';
import { VideoProvider } from './video/video-provider';

/** Course content and the lesson player (design "Instructor 6", spec §4.8). */
@Module({
  imports: [BullModule.registerQueue({ name: FILE_SCAN_QUEUE })],
  controllers: [TeachLessonsController, MyLessonsController],
  providers: [
    TeachLessonsService,
    LessonVideosService,
    LessonFilesService,
    FileScanService,
    FileScanProcessor,
    StudentLessonsService,
    LocalVideoProvider,
    CloudflareStreamProvider,
    {
      provide: VideoProvider,
      inject: [AppConfig, LocalVideoProvider, CloudflareStreamProvider],
      useFactory: (
        config: AppConfig,
        local: LocalVideoProvider,
        cloudflare: CloudflareStreamProvider,
      ) => (config.video.provider === 'cloudflare' ? cloudflare : local),
    },
  ],
  exports: [TeachLessonsService, StudentLessonsService],
})
export class LessonsModule {}
