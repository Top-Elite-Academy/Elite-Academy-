import type { StudentDiscussion } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { studentThreadPath } from '@/config/navigation';
import { AskQuestionForm } from './AskQuestionForm';
import { DiscussionList } from './DiscussionList';

/** Under the exercise: the cohort's questions about it, and "Ask a question" (spec §4.11). */
export function ExerciseDiscussion({
  programSlug,
  lessonId,
  discussion,
}: {
  programSlug: string;
  lessonId: string;
  discussion: StudentDiscussion;
}) {
  const t = useTranslations('Discussion');
  const hrefs = Object.fromEntries(
    discussion.threads.map((thread) => [
      thread.id,
      studentThreadPath(programSlug, lessonId, thread.id),
    ]),
  );

  return (
    <section
      aria-labelledby="discussion-title"
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-white p-5"
    >
      <header className="flex flex-col gap-1">
        <h2 id="discussion-title" className="text-lg font-semibold text-ink">
          {t('title')}
        </h2>
        <p className="text-sm text-ink-muted">{t('intro')}</p>
      </header>
      <p className="rounded-[var(--radius-control)] bg-gold-100 px-3 py-2 text-sm text-ink">
        {t('guideline')}
      </p>
      <AskQuestionForm programSlug={programSlug} lessonId={lessonId} />
      <DiscussionList threads={discussion.threads} hrefs={hrefs} />
    </section>
  );
}
