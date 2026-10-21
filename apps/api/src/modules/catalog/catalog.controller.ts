import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type FaqItem,
  type InstructorProfile,
  type ProgramDetails,
  programSlugSchema,
  type ProgramSummary,
  type StoryItem,
} from '@eta/shared';
import { ApiException } from '../../common/errors/api.exception';
import { Public } from '../../common/authz/decorators';
import { ContentQueryDto, ProgramsQueryDto } from './catalog.dto';
import { FaqsService } from './faqs.service';
import { InstructorsService } from './instructors.service';
import { ProgramDetailsService } from './program-details.service';
import { ProgramsService } from './programs.service';
import { StoriesService } from './stories.service';

/** Read-only public content for the website. Text is returned in the requested language. */
@ApiTags('public content')
@Public()
@Controller()
export class CatalogController {
  constructor(
    private readonly programs: ProgramsService,
    private readonly programDetails: ProgramDetailsService,
    private readonly instructors: InstructorsService,
    private readonly faqs: FaqsService,
    private readonly stories: StoriesService,
  ) {}

  @Get('programs')
  listPrograms(@Query() query: ProgramsQueryDto): Promise<ProgramSummary[]> {
    return this.programs.list(query.locale, query.top);
  }

  @Get('programs/:slug')
  getProgram(
    @Param('slug') slug: string,
    @Query() query: ContentQueryDto,
  ): Promise<ProgramDetails> {
    if (!programSlugSchema.safeParse(slug).success) throw ApiException.notFound();
    return this.programDetails.get(slug, query.locale);
  }

  @Get('instructors')
  listInstructors(@Query() query: ContentQueryDto): Promise<InstructorProfile[]> {
    return this.instructors.list(query.locale);
  }

  @Get('faqs')
  listFaqs(@Query() query: ContentQueryDto): Promise<FaqItem[]> {
    return this.faqs.listGeneral(query.locale);
  }

  @Get('stories')
  listStories(@Query() query: ContentQueryDto): Promise<StoryItem[]> {
    return this.stories.listPublic(query.locale);
  }
}
