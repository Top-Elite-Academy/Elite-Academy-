import type { StudentAssignment, StudentLesson } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { LateBadge } from '@/components/assignments/SubmissionBadges';
import { useCriterionName } from '@/components/assignments/use-criterion-name';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { HandInForm } from './HandInForm';
import { LessonFileList } from './LessonFileList';
import { MyFeedback } from './MyFeedback';

/**
 * The lesson's exercise: what to do, the instructor's files for it, by when,
 * how it is graded, and the student's hand-in.
 */
export function ExerciseCard({
  lessonId,
  assignment,
  files,
}: {
  lessonId: string;
  assignment: StudentAssignment;
  /** Lesson files the instructor marked as part of the exercise (already scanned). */
  files: StudentLesson['files'];
}) {
  const t = useTranslations('StudentExercise');
  const when = useBookingFormat();
  const criterionName = useCriterionName();
  const { submission } = assignment;

  return (
    <section
      aria-labelledby="exercise-title"
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-white p-5"
    >
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">{t('label')}</p>
        <h2 id="exercise-title" className="font-display text-2xl font-semibold text-ink">
          {assignment.title}
        </h2>
        <p className="text-sm text-ink-muted">
          {t('due', { when: when.dayTime(assignment.dueAt) })}
        </p>
      </header>
      {assignment.instructions && (
        <p className="whitespace-pre-line text-ink">{assignment.instructions}</p>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-ink">{t('exerciseFiles')}</h3>
          <LessonFileList lessonId={lessonId} files={files} />
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-ink">{t('rubric')}</summary>
        <ul className="mt-2 flex flex-col gap-1 text-ink-muted">
          {assignment.rubric.map((criterion, index) => (
            <li key={criterion.id}>
              {t('criterion', { title: criterionName(criterion, index), max: criterion.maxPoints })}
            </li>
          ))}
        </ul>
      </details>

      {submission && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
          {t('handedIn', { when: when.dayTime(submission.submittedAt) })}
          <LateBadge days={submission.lateDays} />
        </p>
      )}
      {submission?.grade ? (
        <MyFeedback rubric={assignment.rubric} grade={submission.grade} />
      ) : (
        <HandInForm lessonId={lessonId} submission={submission} />
      )}
    </section>
  );
}
