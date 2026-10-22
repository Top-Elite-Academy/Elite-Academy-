import {
  announcementSchema,
  requestEnrollmentSchema,
  saveAttendanceSchema,
  studentNoteSchema,
} from '@eta/shared';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export class RequestEnrollmentDto extends createZodDto(requestEnrollmentSchema) {}
export class AnnouncementDto extends createZodDto(announcementSchema) {}
export class SaveAttendanceDto extends createZodDto(saveAttendanceSchema) {}
export class StudentNoteDto extends createZodDto(studentNoteSchema) {}
export class AttendanceQueryDto extends createZodDto(
  z.object({ date: z.iso.date({ error: 'date.invalid' }).optional() }),
) {}
