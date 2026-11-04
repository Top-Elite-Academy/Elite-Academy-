import type { NotificationView } from '@eta/shared';
import { useTranslations } from 'next-intl';
import {
  STUDENT_ROUTES,
  studentLessonPath,
  studentThreadPath,
  TEACH_ROUTES,
  teachThreadPath,
} from '@/config/navigation';
import { useBookingFormat } from '@/lib/format/use-booking-format';

const DISCUSSION_KEYS = {
  discussion_question: 'discussionQuestion',
  discussion_reply: 'discussionReply',
  discussion_report: 'discussionReport',
} as const;

/** The sentence and the link for a notification, in the page language. */
export function useNotificationText() {
  const t = useTranslations();
  const when = useBookingFormat();

  const text = (item: NotificationView): string => {
    switch (item.type) {
      case 'announcement':
        return t('Notifications.announcement', {
          cohortName: item.data.cohortName,
          title: item.data.title,
        });
      case 'enrollment_confirmed':
        return t('Notifications.enrollmentConfirmed', {
          programTitle: item.data.programTitle,
          cohortName: item.data.cohortName,
        });
      case 'submission_returned':
        return t('Notifications.submissionReturned', {
          title: item.data.title,
          score: item.data.score,
        });
      case 'discussion_question':
      case 'discussion_reply':
      case 'discussion_report':
        return t(`Notifications.${DISCUSSION_KEYS[item.type]}`, {
          name: item.data.name,
          title: item.data.title,
        });
      default: {
        const at = `${when.longDay(item.data.startAt)} ${when.time(item.data.startAt)}`;
        const key =
          item.type === 'session_cancelled'
            ? (`session_cancelled_${item.data.audience}` as const)
            : item.type;
        return t(`SessionNotifications.${key}`, { name: item.data.name, when: at });
      }
    }
  };

  const href = (item: NotificationView): string => {
    if (item.type === 'announcement' || item.type === 'enrollment_confirmed')
      return STUDENT_ROUTES.courses;
    if (item.type === 'submission_returned')
      return studentLessonPath(item.data.programSlug, item.data.lessonId);
    if (
      item.type === 'discussion_question' ||
      item.type === 'discussion_reply' ||
      item.type === 'discussion_report'
    ) {
      const { data } = item;
      return data.audience === 'staff'
        ? teachThreadPath(data.cohortId, data.threadId)
        : studentThreadPath(data.programSlug, data.lessonId, data.threadId);
    }
    return item.data.audience === 'mentor' ? TEACH_ROUTES.sessions : STUDENT_ROUTES.sessions;
  };

  return { text, href };
}
