import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { FaqsService } from './faqs.service';
import { InstructorsService } from './instructors.service';
import { ProgramDetailsService } from './program-details.service';
import { ProgramsService } from './programs.service';
import { StoriesService } from './stories.service';

@Module({
  controllers: [CatalogController],
  providers: [
    ProgramsService,
    ProgramDetailsService,
    InstructorsService,
    FaqsService,
    StoriesService,
  ],
  exports: [ProgramsService],
})
export class CatalogModule {}
