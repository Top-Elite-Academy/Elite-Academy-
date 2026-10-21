import { contentQuerySchema, mentorsQuerySchema, programsQuerySchema } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';

export class ContentQueryDto extends createZodDto(contentQuerySchema) {}
export class ProgramsQueryDto extends createZodDto(programsQuerySchema) {}
export class MentorsQueryDto extends createZodDto(mentorsQuerySchema) {}
