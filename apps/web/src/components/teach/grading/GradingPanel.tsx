'use client';

import {
  CRITERION_COMMENT_MAX,
  type CriterionScore,
  FEEDBACK_MAX,
  RUBRIC_TOTAL,
  type TeachSubmission,
} from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCriterionName } from '@/components/assignments/use-criterion-name';
import { CONTROL_CLASS } from '@/components/forms/FieldParts';
import { FormAlert } from '@/components/forms/FormAlert';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';
import { SubmittedWork } from './SubmittedWork';

/** The rubric form for one hand-in: points and a comment per criterion, overall feedback. */
export function GradingPanel({ submission }: { submission: TeachSubmission }) {
  const t = useTranslations('TeachGrading');
  const criterionName = useCriterionName();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [scores, setScores] = useState<CriterionScore[]>(submission.scores);
  const [feedback, setFeedback] = useState(submission.feedback);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const returned = submission.status === 'returned';
  const name = `${submission.student.firstName} ${submission.student.lastName}`;
  const total = scores.reduce((sum, score) => sum + (score.points ?? 0), 0);
  const complete = scores.every((score) => score.points !== null);

  const change = (criterionId: string, update: Partial<CriterionScore>) => {
    setScores((current) =>
      current.map((score) => (score.criterionId === criterionId ? { ...score, ...update } : score)),
    );
  };

  const saveDraft = async () => {
    await apiRequest('PUT', `/api/teach/submissions/${submission.id}/grade`, { scores, feedback });
  };

  const onSave = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await saveDraft();
      setStatus({ tone: 'success', text: t('draftSaved') });
      router.refresh();
    } catch (caught) {
      setStatus({ tone: 'error', text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SubmittedWork submission={submission} />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
        className="flex flex-col gap-5 border-t border-border pt-5"
      >
        <h3 className="font-semibold text-ink">{t('rubric')}</h3>
        {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
        {submission.rubric.map((criterion, index) => {
          const score = scores.find((item) => item.criterionId === criterion.id);
          return (
            <fieldset key={criterion.id} disabled={returned} className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-ink">
                {t('criterionTitle', {
                  title: criterionName(criterion, index),
                  max: criterion.maxPoints,
                })}
              </legend>
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex w-28 flex-col gap-1.5 text-sm text-ink">
                  {t('points')}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={criterion.maxPoints}
                    value={score?.points ?? ''}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      change(criterion.id, {
                        points: Number.isFinite(value)
                          ? Math.min(Math.max(Math.round(value), 0), criterion.maxPoints)
                          : null,
                      });
                    }}
                    className={CONTROL_CLASS}
                  />
                </label>
                <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm text-ink">
                  {t('comment')}
                  <textarea
                    rows={2}
                    maxLength={CRITERION_COMMENT_MAX}
                    value={score?.comment ?? ''}
                    onChange={(event) => {
                      change(criterion.id, { comment: event.target.value });
                    }}
                    className={CONTROL_CLASS}
                  />
                </label>
              </div>
            </fieldset>
          );
        })}
        <p aria-live="polite" className="text-lg font-semibold text-ink">
          {t('total', { total, max: RUBRIC_TOTAL })}
        </p>
        <TextAreaField
          name="feedback"
          label={t('feedback')}
          value={feedback}
          onChange={(event) => {
            setFeedback(event.target.value);
          }}
          rows={5}
          maxLength={FEEDBACK_MAX}
          disabled={returned}
        />
        {returned ? (
          <FormAlert tone="success">{t('returnedNote', { name })}</FormAlert>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="submit" variant="secondary" disabled={busy}>
              {t('saveDraft')}
            </Button>
            {complete ? (
              <ConfirmDialog
                trigger={t('return')}
                triggerVariant="primary"
                triggerSize="md"
                title={t('returnTitle', { name })}
                body={t('returnBody', { total })}
                cancelLabel={t('keepEditing')}
                confirmLabel={t('confirmReturn')}
                onConfirm={async () => {
                  await saveDraft();
                  await apiRequest('POST', `/api/teach/submissions/${submission.id}/return`, {});
                  router.refresh();
                }}
              />
            ) : (
              <p className="text-xs text-ink-muted">{t('scoreAll')}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
