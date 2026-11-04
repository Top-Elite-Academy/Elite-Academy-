import type { ScanStatus } from './lessons';

/**
 * A program's syllabus PDF (spec §3.4, §6.2): uploaded by the instructor or an
 * admin, opened by the program's confirmed students, its instructor and admins.
 */

export const SYLLABUS_MAX_BYTES = 25 * 1024 * 1024;

/** One uploaded version, for the instructor (newest first; only the newest clean one counts). */
export interface SyllabusFileView {
  id: string;
  fileName: string;
  sizeBytes: number;
  scanStatus: ScanStatus;
  uploadedAt: string;
}

/** What a student sees on their course page; null until a clean PDF exists. */
export interface StudentSyllabus {
  fileName: string;
  sizeBytes: number;
  updatedAt: string;
}
