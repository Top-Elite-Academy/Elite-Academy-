import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MessagesScreen } from '@/components/messages/MessagesScreen';
import { STUDENT_ROUTES } from '@/config/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.messages');
  return { title: t('metaTitle') };
}

/** Messages & support (spec §4.9): instructors, mentors, Support and Payments. */
export default async function StudentMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('Messages');
  return (
    <MessagesScreen
      base={STUDENT_ROUTES.messages}
      query={await searchParams}
      intro={t('studentIntro')}
    />
  );
}
