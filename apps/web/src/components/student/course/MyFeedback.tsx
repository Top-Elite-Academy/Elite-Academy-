import { RUBRIC_TOTAL, type RubricCriterion, type StudentAssignment } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useCriterionName } from '@/components/assignments/use-criterion-name';

type Grade = NonNullable<NonNullable<StudentAssignment['submission']>['grade']>;

/** The returned grade: total, points and comments per criterion, overall feedback. */
export function MyFeedback({ rubric, grade }: { rubric: RubricCriterion[]; grade: Grade }) {
  const t = useTranslations('StudentExercise');
  const criterionName = useCriterionName();
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <p className="text-lg font-semibold text-ink">
        {t('grade', { score: grade.score, max: RUBRIC_TOTAL })}
      </p>
      <dl className="flex flex-col gap-3">
        {rubric.map((criterion, index) => {
          const score = grade.scores.find((item) => item.criterionId === criterion.id);
          return (
            <div key={criterion.id} className="flex flex-col gap-0.5">
              <dt className="text-sm font-semibold text-ink">{criterionName(criterion, index)}</dt>
              <dd className="text-sm text-ink-muted">
                {t('points', { points: score?.points ?? 0, max: criterion.maxPoints })}
                {score?.comment ? ` — ${score.comment}` : ''}
              </dd>
            </div>
          );
        })}
      </dl>
      {grade.feedback && (
        <div>
          <h3 className="text-sm font-semibold text-ink">{t('feedback')}</h3>
          <p className="mt-1 whitespace-pre-line text-ink">{grade.feedback}</p>
        </div>
      )}
    </div>
  );
}
