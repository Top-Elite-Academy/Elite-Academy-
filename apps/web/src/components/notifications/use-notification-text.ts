import type { NotificationView } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { STUDENT_ROUTES, TEACH_ROUTES } from '@/config/navigation';
import { useBookingFormat } from '@/lib/format/use-booking-format';

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
    return item.data.audience === 'mentor' ? TEACH_ROUTES.sessions : STUDENT_ROUTES.sessions;
  };

  return { text, href };
}
