import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DownloadIcon, LiveIcon, MessageIcon, PlayIcon } from '@/components/ui/icons';
import { CourseSection } from '../CourseSection';

const ITEMS: { key: 'live' | 'recordings' | 'materials' | 'support'; icon: ReactNode }[] = [
  { key: 'live', icon: <LiveIcon className="size-5" /> },
  { key: 'recordings', icon: <PlayIcon className="size-5" /> },
  { key: 'materials', icon: <DownloadIcon className="size-5" /> },
  { key: 'support', icon: <MessageIcon className="size-5" /> },
];

/** Live classes via Zoom, recordings in the student area, materials to download (spec §3.3). */
export function AccessSection() {
  const t = useTranslations('Course.access');
  return (
    <CourseSection id="access" title={t('title')}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li
            key={item.key}
            className="flex gap-3 rounded-[var(--radius-control)] bg-cream p-4 text-sm text-ink"
          >
            <span className="text-crimson-700">{item.icon}</span>
            {t(item.key)}
          </li>
        ))}
      </ul>
    </CourseSection>
  );
}
