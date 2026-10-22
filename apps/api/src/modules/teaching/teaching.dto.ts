import { announcementSchema, requestEnrollmentSchema } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';

export class RequestEnrollmentDto extends createZodDto(requestEnrollmentSchema) {}
export class AnnouncementDto extends createZodDto(announcementSchema) {}
