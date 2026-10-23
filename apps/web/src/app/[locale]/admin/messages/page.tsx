import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MessagesScreen } from '@/components/messages/MessagesScreen';
import { ADMIN_ROUTES } from '@/config/navigation';
import { requireUser } from '@/lib/auth/require-user';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Messages');
  return { title: t('teamTitle') };
}

/** Team inbox (spec §4.9): Support threads for admins, Payments threads for admins and sales. */
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(ADMIN_ROUTES.messages, ['admin', 'sales']);
  const t = await getTranslations('Messages');
  return (
    <MessagesScreen
      base={ADMIN_ROUTES.messages}
      query={await searchParams}
      intro={t('teamIntro')}
      teamInbox
    />
  );
}
