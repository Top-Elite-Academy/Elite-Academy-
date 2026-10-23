import type { CourseOutline } from '@eta/shared';

type OutlineLesson = CourseOutline['modules'][number]['lessons'][number];

/** Lessons the student can open now, in course order. */
export function openLessons(outline: CourseOutline): OutlineLesson[] {
  return outline.modules
    .flatMap((module) => module.lessons)
    .filter((lesson) => lesson.lockedUntilWeek === null);
}

/** The open lessons before and after this one (locked ones are skipped). */
export function lessonNeighbours(outline: CourseOutline, lessonId: string) {
  const lessons = openLessons(outline);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return {
    previousId: index > 0 ? (lessons[index - 1]?.id ?? null) : null,
    nextId: index >= 0 ? (lessons[index + 1]?.id ?? null) : null,
  };
}

/** Where "Continue" goes: the first open lesson not completed yet. */
export function lessonToContinue(outline: CourseOutline): OutlineLesson | null {
  return openLessons(outline).find((lesson) => !lesson.completed) ?? null;
}
