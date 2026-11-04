import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FILE_SCAN_QUEUE } from '../lessons/lesson-files.service';
import { LessonsModule } from '../lessons/lessons.module';
import { MySyllabusController, TeachSyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';

/** Program syllabus PDFs (spec §3.4, §6.2). */
@Module({
  imports: [BullModule.registerQueue({ name: FILE_SCAN_QUEUE }), LessonsModule],
  controllers: [TeachSyllabusController, MySyllabusController],
  providers: [SyllabusService],
})
export class SyllabusModule {}
