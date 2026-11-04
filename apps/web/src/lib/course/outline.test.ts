import type { CourseOutline } from '@eta/shared';
import { describe, expect, it } from 'vitest';
import { lessonNeighbours, lessonToContinue } from './outline';

const lesson = (id: string, completed: boolean, lockedUntilWeek: number | null = null) => ({
  id,
  position: Number(id),
  title: `Lesson ${id}`,
  completed,
  lockedUntilWeek,
});

const outline: CourseOutline = {
  program: { slug: 'fsa', title: 'Full Stack' },
  syllabus: null,
  cohort: { id: 'c', name: 'FSA-03', week: 12 },
  progressPercent: 25,
  modules: [
    { id: 'm1', title: 'Module 1', lessons: [lesson('1', true), lesson('2', false)] },
    { id: 'm2', title: 'Module 2', lessons: [lesson('3', false, 14)] },
    { id: null, title: null, lessons: [lesson('4', false)] },
  ],
};

describe('course outline helpers', () => {
  it('finds neighbours across modules and skips locked lessons', () => {
    expect(lessonNeighbours(outline, '1')).toEqual({ previousId: null, nextId: '2' });
    expect(lessonNeighbours(outline, '2')).toEqual({ previousId: '1', nextId: '4' });
    expect(lessonNeighbours(outline, '4')).toEqual({ previousId: '2', nextId: null });
  });

  it('continues with the first open lesson not done yet', () => {
    expect(lessonToContinue(outline)?.id).toBe('2');
    const allDone: CourseOutline = {
      ...outline,
      modules: [
        { id: 'm1', title: 'Module 1', lessons: [lesson('1', true), lesson('3', false, 14)] },
      ],
    };
    expect(lessonToContinue(allDone)).toBeNull();
  });
});
