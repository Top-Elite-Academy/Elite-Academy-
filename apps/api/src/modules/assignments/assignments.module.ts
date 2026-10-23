import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FILE_SCAN_QUEUE } from '../lessons/lesson-files.service';
import { LessonsModule } from '../lessons/lessons.module';
import { TeachingModule } from '../teaching/teaching.module';
import { GradingService } from './grading.service';
import { MySubmissionsController } from './my-submissions.controller';
import { StudentSubmissionsService } from './student-submissions.service';
import { TeachAssignmentsController } from './teach-assignments.controller';
import { TeachAssignmentsService } from './teach-assignments.service';

/** Exercises, hand-ins and grading with a rubric (design "Instructor 4"). */
@Module({
  imports: [BullModule.registerQueue({ name: FILE_SCAN_QUEUE }), LessonsModule, TeachingModule],
  controllers: [TeachAssignmentsController, MySubmissionsController],
  providers: [TeachAssignmentsService, GradingService, StudentSubmissionsService],
  exports: [GradingService],
})
export class AssignmentsModule {}
