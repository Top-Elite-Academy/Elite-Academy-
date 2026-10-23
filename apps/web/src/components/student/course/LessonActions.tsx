'use client';

import type { StudentLesson } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { studentLessonPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** Mark as complete, and the previous / next lesson. */
export function LessonActions({
  lesson,
  previousId,
  nextId,
}: {
  lesson: StudentLesson;
  /** Neighbours the student can open (locked lessons are skipped). */
  previousId: string | null;
  nextId: string | null;
}) {
  const t = useTranslations('StudentLesson');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const slug = lesson.program.slug;

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await apiRequest('POST', `/api/me/lessons/${lesson.id}/progress`, {
        completed: !lesson.completed,
      });
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {failed && <FormAlert tone="error">{tErrors('generic')}</FormAlert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={lesson.completed ? 'secondary' : 'primary'}
          aria-pressed={lesson.completed}
          disabled={busy}
          onClick={() => void toggle()}
        >
          {t('complete')}
        </Button>
        <p role="status" className="text-sm text-ink-muted">
          {lesson.completed ? t('completedNote') : ''}
        </p>
      </div>
      <nav aria-label={t('lessonNav')} className="flex flex-wrap justify-between gap-3">
        {previousId ? (
          <ButtonLink href={studentLessonPath(slug, previousId)} variant="ghost">
            {t('previous')}
          </ButtonLink>
        ) : (
          <span />
        )}
        {nextId && (
          <ButtonLink href={studentLessonPath(slug, nextId)} variant="secondary">
            {t('next')}
          </ButtonLink>
        )}
      </nav>
    </div>
  );
}
