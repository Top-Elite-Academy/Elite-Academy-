import type { DiscussionThreadView } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ThreadView } from '@/components/discussions/ThreadView';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { TEACH_ROUTES, teachCohortPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

type Params = Promise<{ id: string; threadId: string }>;

const loadThread = (threadId: string) =>
  isBookingId(threadId)
    ? getAsUser<DiscussionThreadView>(`/api/discussions/${threadId}`).catch(() => null)
    : Promise.resolve(null);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const thread = await loadThread((await params).threadId);
  const t = await getTranslations('Discussion');
  return { title: thread?.title ?? t('title') };
}

/** One question of the cohort, with the instructor's tools (spec §4.11). */
export default async function TeachThreadPage({ params }: { params: Params }) {
  const { id, threadId } = await params;
  const [thread, t] = await Promise.all([loadThread(threadId), getTranslations('Teach')]);
  // Only the cohort's instructor moderates; anyone else gets the same answer as a missing page.
  if (!thread?.moderator || thread.context.cohortId !== id) notFound();
  const discussionsHref = `${teachCohortPath(id)}?tab=discussions`;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('cohort.crumb'), href: TEACH_ROUTES.cohorts },
          { label: thread.context.cohortName, href: discussionsHref },
          { label: thread.title },
        ]}
      />
      <ThreadView thread={thread} afterDelete={discussionsHref} />
    </div>
  );
}
