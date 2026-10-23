import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MessagesScreen } from '@/components/messages/MessagesScreen';
import { TEACH_ROUTES } from '@/config/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Messages');
  return { title: t('title') };
}

/** Messages with the instructor's (or mentor's) students (spec §4.9). */
export default async function TeachMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('Messages');
  return (
    <MessagesScreen
      base={TEACH_ROUTES.messages}
      query={await searchParams}
      intro={t('staffIntro')}
    />
  );
}
