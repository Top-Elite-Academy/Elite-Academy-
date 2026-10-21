'use client';

import { type Locale, LOCALES } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDownIcon, GlobeIcon } from '@/components/ui/icons';
import { LOCALE_NAMES } from '@/config/site';
import { Link, usePathname } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';

interface LanguageSwitcherProps {
  /** Signed-in users also get the choice saved to their profile (spec §2). */
  saveToProfile?: boolean;
  onDark?: boolean;
}

/**
 * Disclosure-style dropdown: a button that shows a list of links to the same
 * page in each language. Keyboard: Enter/Space opens, Escape closes and returns
 * focus, Tab moves through the options. Visitors' choice is kept in a cookie by next-intl.
 */
export function LanguageSwitcher({ saveToProfile = false, onDark = false }: LanguageSwitcherProps) {
  const t = useTranslations('LanguageSwitcher');
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const query = Object.fromEntries(useSearchParams().entries());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (locale: Locale) => {
    setOpen(false);
    if (saveToProfile && locale !== current) {
      // Best effort: the cookie already keeps the choice if this request fails.
      void apiRequest('PATCH', '/api/users/me', { locale }).catch(() => undefined);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('current', { language: LOCALE_NAMES[current] })}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold',
          onDark ? 'text-white hover:bg-navy-800' : 'text-navy-900 hover:bg-navy-50',
        )}
      >
        <GlobeIcon />
        <span lang={current}>{LOCALE_NAMES[current]}</span>
        <ChevronDownIcon className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>

      <ul
        id={listId}
        hidden={!open}
        className="absolute end-0 z-40 mt-2 min-w-40 rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-lg"
      >
        {LOCALES.map((locale) => (
          <li key={locale}>
            <Link
              href={{ pathname, query }}
              locale={locale}
              lang={locale}
              hrefLang={locale}
              aria-current={locale === current ? 'true' : undefined}
              onClick={() => {
                choose(locale);
              }}
              className={cn(
                'block px-4 py-2 text-sm text-navy-900 hover:bg-navy-50',
                locale === current && 'font-bold',
              )}
            >
              {LOCALE_NAMES[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
