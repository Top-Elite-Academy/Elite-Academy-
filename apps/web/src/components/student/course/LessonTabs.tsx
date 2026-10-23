'use client';

import type { StudentLesson } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { DownloadIcon } from '@/components/ui/icons';
import { lessonFileDownloadPath } from '@/config/navigation';
import { formatFileSize } from '@/lib/format/file-size';
import { cn } from '@/lib/cn';
import { AskInstructor } from './AskInstructor';

const ALL_TABS = ['about', 'downloads', 'ask'] as const;
type Tab = (typeof ALL_TABS)[number];

/**
 * About, Downloads and Ask the instructor under the video (WAI-ARIA tabs:
 * arrow keys move between them).
 */
export function LessonTabs({ lesson }: { lesson: StudentLesson }) {
  const t = useTranslations('StudentLesson');
  const id = useId();
  const [active, setActive] = useState<Tab>('about');
  const buttons = useRef<Record<Tab, HTMLButtonElement | null>>({
    about: null,
    downloads: null,
    ask: null,
  });
  const TABS = ALL_TABS.filter((tab) => tab !== 'ask' || lesson.instructor !== null);

  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -TABS.length, End: TABS.length }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    // Arrow keys follow the reading direction (RTL flips them).
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const move = rtl && Math.abs(step) === 1 ? -step : step;
    const index = Math.min(Math.max(TABS.indexOf(active) + move, 0), TABS.length - 1);
    const next = TABS[index] ?? 'about';
    setActive(next);
    buttons.current[next]?.focus();
  };

  const label = (tab: Tab) =>
    tab === 'downloads' ? t('tabs.downloads', { count: lesson.files.length }) : t(`tabs.${tab}`);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white">
      <div
        role="tablist"
        aria-label={t('tabs.label')}
        className="flex gap-1 border-b border-border px-3"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={(element) => {
              buttons.current[tab] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-${tab}-tab`}
            aria-controls={`${id}-${tab}`}
            aria-selected={active === tab}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => {
              setActive(tab);
            }}
            onKeyDown={onKeyDown}
            className={cn(
              '-mb-px min-h-11 border-b-2 px-3 text-sm font-semibold',
              active === tab
                ? 'border-crimson-700 text-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {label(tab)}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`${id}-${tab}`}
          aria-labelledby={`${id}-${tab}-tab`}
          hidden={active !== tab}
          className="p-5"
        >
          <Panel tab={tab} lesson={lesson} />
        </div>
      ))}
    </div>
  );
}

function Panel({ tab, lesson }: { tab: Tab; lesson: StudentLesson }) {
  if (tab === 'about') return <About text={lesson.about} />;
  if (tab === 'downloads') return <Downloads lesson={lesson} />;
  return lesson.instructor && <AskInstructor lesson={lesson} instructor={lesson.instructor} />;
}

function About({ text }: { text: string }) {
  const t = useTranslations('StudentLesson');
  return text ? (
    <p className="whitespace-pre-line text-ink">{text}</p>
  ) : (
    <p className="text-ink-muted">{t('noAbout')}</p>
  );
}

function Downloads({ lesson }: { lesson: StudentLesson }) {
  const t = useTranslations('StudentLesson');
  const locale = useLocale();
  if (lesson.files.length === 0) return <p className="text-ink-muted">{t('noFiles')}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {lesson.files.map((file) => (
        <li key={file.id} className="flex flex-wrap items-center gap-3 py-3">
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink">
            {t(`kind.${file.kind}`)}
          </span>
          <span className="min-w-0 flex-1 break-all text-ink" dir="ltr">
            {file.fileName}
          </span>
          <span className="text-sm text-ink-muted" dir="ltr">
            {formatFileSize(file.sizeBytes, locale)}
          </span>
          <a
            href={lessonFileDownloadPath(lesson.id, file.id)}
            aria-label={t('download', { name: file.fileName })}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-crimson-700 underline"
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            {t('downloadShort')}
          </a>
        </li>
      ))}
    </ul>
  );
}
