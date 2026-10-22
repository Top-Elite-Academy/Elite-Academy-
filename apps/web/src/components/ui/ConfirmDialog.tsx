'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/api-error';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

/**
 * A button that asks "Are you sure?" in a native modal dialog (focus kept
 * inside, Escape closes) before running `onConfirm`. API errors are shown in
 * the dialog in the page language.
 */
export function ConfirmDialog({
  trigger,
  triggerVariant = 'secondary',
  triggerSize = 'sm',
  srContext,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onConfirm,
}: {
  trigger: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  /** Extra words for screen readers, e.g. which session. */
  srContext?: string;
  title: string;
  body: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations('errors');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      dialogRef.current?.close();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : 'generic';
      setError(t.has(code) ? t(code as 'generic') : t('generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        aria-haspopup="dialog"
        onClick={() => {
          setError(null);
          dialogRef.current?.showModal();
        }}
      >
        {trigger}
        {srContext && <span className="sr-only">{`: ${srContext}`}</span>}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-2 text-ink-muted">{body}</div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            {cancelLabel}
          </Button>
          <Button disabled={busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
