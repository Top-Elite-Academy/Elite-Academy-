import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { MyEnrollmentsController, StaffEnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { TeachingController } from './teaching.controller';
import { TeachingService } from './teaching.service';

/** Cohort enrollment, the instructor area and announcements (instructor milestone 1). */
@Module({
  controllers: [TeachingController, MyEnrollmentsController, StaffEnrollmentsController],
  providers: [TeachingService, EnrollmentsService, AnnouncementsService],
})
export class TeachingModule {}
