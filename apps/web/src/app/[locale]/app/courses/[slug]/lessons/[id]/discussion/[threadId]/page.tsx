import type { DiscussionThreadView } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ThreadView } from '@/components/discussions/ThreadView';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { STUDENT_ROUTES, studentLessonPath } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { isBookingId } from '@/lib/booking/booking-state';

type Params = Promise<{ slug: string; id: string; threadId: string }>;

const loadThread = (threadId: string) =>
  isBookingId(threadId)
    ? getAsUser<DiscussionThreadView>(`/api/discussions/${threadId}`).catch(() => null)
    : Promise.resolve(null);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const thread = await loadThread((await params).threadId);
  const t = await getTranslations('Discussion');
  return { title: thread?.title ?? t('title') };
}

/** One question about an exercise, with its replies (spec §4.11). */
export default async function StudentThreadPage({ params }: { params: Params }) {
  const { slug, id, threadId } = await params;
  const [thread, tCourses, t] = await Promise.all([
    loadThread(threadId),
    getTranslations('Student.courses'),
    getTranslations('Discussion'),
  ]);
  // Another lesson's or cohort's question looks the same as a missing one.
  if (!thread || thread.context.lessonId !== id || thread.context.programSlug !== slug) notFound();
  const lessonHref = studentLessonPath(slug, id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: tCourses('title'), href: STUDENT_ROUTES.courses },
          { label: t('backToLesson'), href: lessonHref },
          { label: thread.title },
        ]}
      />
      <ThreadView thread={thread} afterDelete={lessonHref} />
    </div>
  );
}
