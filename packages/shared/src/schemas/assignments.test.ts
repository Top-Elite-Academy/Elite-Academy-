import { describe, expect, it } from 'vitest';
import {
  assignmentDueAt,
  isGitHubUrl,
  lateDays,
  saveAssignmentSchema,
  submitWorkSchema,
} from './assignments';

describe('assignment deadlines', () => {
  it('is the last day of the cohort week at 23:59 Jerusalem time', () => {
    // Cohort starts Sunday 2030-01-06; week 2 ends Saturday 2030-01-19 (UTC+2 in winter).
    expect(assignmentDueAt('2030-01-06', 2).toISOString()).toBe('2030-01-19T21:59:00.000Z');
  });

  it('counts started late days', () => {
    const due = new Date('2030-01-19T21:59:00Z');
    expect(lateDays(due, new Date('2030-01-19T21:00:00Z'))).toBe(0);
    expect(lateDays(due, new Date('2030-01-19T22:30:00Z'))).toBe(1);
    expect(lateDays(due, new Date('2030-01-21T23:00:00Z'))).toBe(3);
  });
});

describe('assignment schemas', () => {
  const base = { title: 'Auth API', instructions: '', dueWeek: 12 };

  it('needs rubric points that add up to 100', () => {
    const ok = saveAssignmentSchema.safeParse({
      ...base,
      rubric: [
        { title: 'Works', maxPoints: 60 },
        { title: 'Code quality', maxPoints: 40 },
      ],
    });
    expect(ok.success).toBe(true);
    const wrong = saveAssignmentSchema.safeParse({
      ...base,
      rubric: [{ title: 'Works', maxPoints: 90 }],
    });
    expect(wrong.error?.issues[0]?.message).toBe('assignment.rubricTotal');
  });

  it('accepts GitHub repository links only', () => {
    expect(isGitHubUrl('https://github.com/maya/auth-api')).toBe(true);
    expect(isGitHubUrl('https://github.com/maya')).toBe(false);
    expect(isGitHubUrl('http://github.com/maya/auth-api')).toBe(false);
    expect(isGitHubUrl('https://github.com.evil.io/maya/auth-api')).toBe(false);
    expect(submitWorkSchema.parse({ repoUrl: '', note: '' }).repoUrl).toBeNull();
    expect(submitWorkSchema.safeParse({ repoUrl: 'javascript:alert(1)', note: '' }).success).toBe(
      false,
    );
  });
});
