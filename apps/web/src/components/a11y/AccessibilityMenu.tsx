'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { AccessibilityIcon, CloseIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { A11Y_TOGGLES, DEFAULT_PREFS, TEXT_SIZES, type TextSize } from '@/lib/a11y/preferences';
import { updateA11yPrefs, useA11yPrefs } from '@/lib/a11y/use-a11y-prefs';
import { cn } from '@/lib/cn';

/**
 * Accessibility settings (IS 5568): a tab on the side of every page — clear of
 * the bottom action bars and the chat button — that opens a native <dialog>
 * (focus trapped, Escape closes, focus returns to the tab).
 */
export function AccessibilityMenu() {
  const t = useTranslations('A11yMenu');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const prefs = useA11yPrefs();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="fixed start-0 top-1/2 z-40 flex size-12 -translate-y-1/2 items-center justify-center rounded-e-[var(--radius-control)] bg-slate-700 text-white shadow-lg hover:bg-ink"
      >
        <AccessibilityIcon className="size-7" />
        <span className="sr-only">{t('open')}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="a11y-menu-title"
        className="m-0 h-dvh max-h-none w-full max-w-sm bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <div className="flex min-h-full flex-col gap-6 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="a11y-menu-title" className="text-xl font-bold">
                {t('title')}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{t('intro')}</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] hover:bg-sand"
            >
              <CloseIcon className="size-6" />
              <span className="sr-only">{t('close')}</span>
            </button>
          </div>

          <fieldset>
            <legend className="font-semibold">{t('textSize')}</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TEXT_SIZES.map((size) => (
                <label
                  key={size}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-2 font-semibold',
                    SIZE_PREVIEW[size],
                    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson-700',
                    prefs.textSize === size
                      ? 'border-2 border-crimson-700 bg-crimson-50'
                      : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="a11y-text-size"
                    value={size}
                    checked={prefs.textSize === size}
                    onChange={() => {
                      updateA11yPrefs({ textSize: size });
                    }}
                    className="sr-only"
                  />
                  {t(`sizes.${size}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <ul className="flex flex-col gap-2">
            {A11Y_TOGGLES.map((key) => (
              <li key={key}>
                <Toggle
                  label={t(`options.${key}`)}
                  checked={prefs[key]}
                  onChange={(on) => {
                    updateA11yPrefs({ [key]: on });
                  }}
                />
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                updateA11yPrefs(DEFAULT_PREFS);
              }}
              className="min-h-11 rounded-[var(--radius-control)] border border-ink/25 px-4 font-semibold hover:bg-sand"
            >
              {t('reset')}
            </button>
            <Link
              href={ROUTES.accessibility}
              onClick={close}
              className="self-start rounded-sm font-semibold text-crimson-700 underline"
            >
              {t('statement')}
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Each size option is shown in the size it gives. */
const SIZE_PREVIEW: Record<TextSize, string> = {
  normal: 'text-sm',
  large: 'text-base',
  larger: 'text-lg',
};

/** An on/off switch: a real button with role="switch", so it is announced as "on" or "off". */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked);
      }}
      className={cn(
        'flex min-h-12 w-full items-center justify-between gap-4 rounded-[var(--radius-control)] border px-4 py-2 text-start font-semibold',
        checked ? 'border-crimson-700 bg-crimson-50' : 'border-border hover:bg-sand',
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-crimson-700' : 'bg-ink/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white transition-[inset-inline-start]',
            checked ? 'start-[1.375rem]' : 'start-0.5',
          )}
        />
      </span>
    </button>
  );
}
