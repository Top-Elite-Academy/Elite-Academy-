import type { DiscussionAuthor } from '@eta/shared';
import { useTranslations } from 'next-intl';

/** "Maya R.", "You", or "Dania H. (Instructor)". */
export function AuthorName({ author }: { author: DiscussionAuthor }) {
  const t = useTranslations('Discussion');
  const name = author.isMe ? t('you') : author.name;
  return (
    <span className={author.role === 'staff' ? 'font-semibold text-crimson-700' : undefined}>
      {author.role === 'staff' ? t('staffName', { name }) : name}
    </span>
  );
}
