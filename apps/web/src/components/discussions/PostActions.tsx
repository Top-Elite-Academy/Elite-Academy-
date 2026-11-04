'use client';

import { type DiscussionPost, REPORT_REASON_MAX } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/**
 * What the reader may do with one post: delete (own post, or any as
 * instructor), report (someone else's, students), and — for the instructor —
 * mark a reply as the answer. Deleting the question goes back to `afterDelete`.
 */
export function PostActions({
  threadId,
  post,
  isQuestion,
  moderator,
  isAnswer,
  afterDelete,
}: {
  threadId: string;
  post: DiscussionPost;
  isQuestion: boolean;
  moderator: boolean;
  isAnswer: boolean;
  afterDelete: string;
}) {
  const t = useTranslations('Discussion');
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/discussions/${threadId}` as const;
  const markable = moderator && !isQuestion && post.removed === null;

  const setAnswer = async (answerReplyId: string | null) => {
    setBusy(true);
    try {
      await apiRequest('PATCH', base, { answerReplyId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!post.canDelete && !post.canReport && !markable) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {markable && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          aria-pressed={isAnswer}
          onClick={() => void setAnswer(isAnswer ? null : post.id)}
        >
          {isAnswer ? t('unmarkAnswer') : t('markAnswer')}
        </Button>
      )}
      {post.canReport && (
        <ConfirmDialog
          trigger={t('report')}
          triggerVariant="ghost"
          title={t('reportTitle')}
          body={
            <div className="flex flex-col gap-3">
              <p>{t('reportBody')}</p>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t('reportReason')}
                <textarea
                  rows={3}
                  maxLength={REPORT_REASON_MAX}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                  className="rounded-[var(--radius-control)] border border-ink/30 p-2 font-normal"
                />
              </label>
            </div>
          }
          cancelLabel={t('cancel')}
          confirmLabel={t('sendReport')}
          onConfirm={async () => {
            await apiRequest(
              'POST',
              isQuestion ? `${base}/report` : `${base}/replies/${post.id}/report`,
              { reason },
            );
            setReason('');
          }}
        />
      )}
      {post.canDelete && (
        <ConfirmDialog
          trigger={t('delete')}
          triggerVariant="ghost"
          title={t(isQuestion ? 'deleteQuestionTitle' : 'deleteReplyTitle')}
          body={t(post.author.isMe ? 'deleteOwnBody' : 'removeBody')}
          cancelLabel={t('cancel')}
          confirmLabel={t('delete')}
          onConfirm={async () => {
            if (isQuestion) {
              await apiRequest('DELETE', base);
              router.push(afterDelete);
            } else {
              await apiRequest('DELETE', `/api/discussions/replies/${post.id}`);
              router.refresh();
            }
          }}
        />
      )}
    </div>
  );
}
