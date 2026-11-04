import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { TeachingModule } from '../teaching/teaching.module';
import {
  DiscussionsController,
  MyDiscussionController,
  TeachDiscussionsController,
} from './discussions.controller';
import { DiscussionModerationService } from './discussion-moderation.service';
import { DiscussionsService } from './discussions.service';

/** Assignment discussions (spec §4.11). */
@Module({
  imports: [LessonsModule, TeachingModule],
  controllers: [MyDiscussionController, TeachDiscussionsController, DiscussionsController],
  providers: [DiscussionsService, DiscussionModerationService],
})
export class DiscussionsModule {}
