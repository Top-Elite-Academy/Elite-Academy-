import type { SubmissionFileView } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

/** "Late · 2 days" (late work is accepted, only marked) or "On time". */
export function LateBadge({ days }: { days: number }) {
  const t = useTranslations('Grading');
  return days > 0 ? (
    <Badge tone="gold">{t('late', { days })}</Badge>
  ) : (
    <Badge tone="sage">{t('onTime')}</Badge>
  );
}

const SCAN_TONE: Record<SubmissionFileView['scanStatus'], BadgeTone> = {
  scanning: 'gold',
  clean: 'sage',
  infected: 'danger',
  failed: 'danger',
};

/** Where a handed-in file is in the virus scan. */
export function ScanBadge({ status }: { status: SubmissionFileView['scanStatus'] }) {
  const t = useTranslations('Grading.scan');
  return <Badge tone={SCAN_TONE[status]}>{t(status)}</Badge>;
}
