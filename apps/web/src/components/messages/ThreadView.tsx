'use client';

import type { ConversationThread, MessageView } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { ScanBadge } from '@/components/assignments/SubmissionBadges';
import { DownloadIcon } from '@/components/ui/icons';
import { messageAttachmentPath } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/format/file-size';
import { useBookingFormat } from '@/lib/format/use-booking-format';
import { Composer } from './Composer';
import { useCounterpartName } from './use-counterpart-name';

/** One thread (spec §4.9 right pane): messages oldest first, the composer below. */
export function ThreadView({ thread }: { thread: ConversationThread }) {
  const t = useTranslations('Messages');
  const name = useCounterpartName();
  const logRef = useRef<HTMLDivElement>(null);
  const lastOwn = [...thread.messages].reverse().find((message) => message.fromMe);
  const seen =
    lastOwn && thread.readByOthersAt !== null && thread.readByOthersAt >= lastOwn.createdAt;

  // Start at the newest message, like any chat.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [thread.messages.length]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="font-display text-2xl font-semibold text-ink">{name(thread.counterpart)}</h2>
        {thread.subject && <p className="text-sm text-ink-muted">{thread.subject}</p>}
      </header>
      <div
        ref={logRef}
        role="log"
        aria-label={t('conversationWith', { name: name(thread.counterpart) })}
        // A scrolling area must be reachable with the keyboard (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-[var(--radius-control)] border border-border bg-cream/40 p-3"
      >
        {thread.messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
      </div>
      {seen && <p className="text-end text-xs text-ink-muted">{t('seen')}</p>}
      <Composer conversationId={thread.id} />
    </div>
  );
}

function Bubble({ message }: { message: MessageView }) {
  const t = useTranslations('Messages');
  const locale = useLocale();
  const when = useBookingFormat();
  return (
    <article
      className={cn(
        'flex max-w-[85%] flex-col gap-1 rounded-[var(--radius-card)] px-3 py-2 text-sm',
        message.fromMe ? 'self-end bg-crimson-50' : 'self-start bg-white',
      )}
    >
      <p className="text-xs text-ink-muted">
        {message.fromMe ? t('you') : `${message.sender.firstName} ${message.sender.lastName}`}
        {' · '}
        {when.dayTime(message.createdAt)}
      </p>
      {message.body && <p className="whitespace-pre-line break-words text-ink">{message.body}</p>}
      {message.attachments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {message.attachments.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-2">
              {file.scanStatus === 'clean' ? (
                <a
                  href={messageAttachmentPath(file.id)}
                  aria-label={t('download', { name: file.fileName })}
                  className="inline-flex items-center gap-1 font-semibold text-crimson-700 underline"
                >
                  <DownloadIcon className="size-4" aria-hidden="true" />
                  <span dir="ltr">{file.fileName}</span>
                </a>
              ) : (
                <>
                  <span dir="ltr" className="text-ink">
                    {file.fileName}
                  </span>
                  <ScanBadge status={file.scanStatus} />
                </>
              )}
              <span dir="ltr" className="text-xs text-ink-muted">
                {formatFileSize(file.sizeBytes, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
