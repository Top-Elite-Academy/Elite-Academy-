import type { ProgressStatus } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { CheckCircleIcon, InfoIcon } from '@/components/ui/icons';

const TONE: Record<ProgressStatus, BadgeTone> = {
  on_track: 'sage',
  behind: 'gold',
  at_risk: 'danger',
};

/** On track / Behind / At risk, with an icon so colour is never the only signal. */
export function ProgressBadge({ progress }: { progress: ProgressStatus | null }) {
  const t = useTranslations('TeachProgress.statuses');
  if (!progress) return <span className="text-sm text-ink-muted">{t('none')}</span>;
  const Icon = progress === 'on_track' ? CheckCircleIcon : InfoIcon;
  return (
    <Badge tone={TONE[progress]} icon={<Icon className="size-3.5" />}>
      {t(progress)}
    </Badge>
  );
}
