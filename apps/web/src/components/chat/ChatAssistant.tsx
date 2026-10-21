'use client';

import type { FaqItem, ProgramSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { type SyntheticEvent, useEffect, useId, useRef, useState } from 'react';
import { Crest } from '@/components/brand/Crest';
import { CloseIcon, MessageIcon, SendIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { ChatBubble, type MentoringPrices, useChipLabel } from './ChatBubble';
import { useChat } from './use-chat';

const MAX_QUESTION_LENGTH = 300;

/**
 * Chat assistant on every public page (design "Chat assistant"). A non-modal
 * panel: the page stays usable, Escape closes it and focus returns to the button.
 * New answers are announced to screen readers through the conversation log.
 */
export function ChatAssistant({
  programs,
  faqs,
  mentoringPrices,
}: {
  programs: ProgramSummary[];
  faqs: FaqItem[];
  mentoringPrices: MentoringPrices | null;
}) {
  const t = useTranslations('Chat');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  // Escape closes the panel from anywhere on the page while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      launcherRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
          className="chat-panel fixed inset-x-2 bottom-24 z-40 flex max-h-[min(40rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-2xl sm:inset-x-auto sm:end-6 sm:w-[24rem]"
        >
          <header className="flex items-center gap-3 border-b-2 border-gold-400 bg-maroon-900 px-4 py-3 text-white on-dark">
            <Crest size={44} />
            <div className="min-w-0 flex-1">
              <h2 id={`${panelId}-title`} className="font-semibold">
                {t('title')}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-white/85">
                <span aria-hidden="true" className="size-2 rounded-full bg-[#7bd389]" />
                {t('status')}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <CloseIcon className="size-5" />
              <span className="sr-only">{t('close')}</span>
            </button>
          </header>
          <Conversation
            programs={programs}
            faqs={faqs}
            mentoringPrices={mentoringPrices}
            inputRef={inputRef}
          />
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        className="chat-launcher fixed end-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full border-4 border-gold-400 bg-crimson-700 text-white shadow-xl hover:bg-crimson-800 sm:end-6 sm:bottom-6 lg:size-16"
      >
        {open ? <CloseIcon className="size-7" /> : <MessageIcon className="size-7" />}
        <span className="sr-only">{open ? t('close') : t('open')}</span>
      </button>
    </>
  );
}

function Conversation({
  programs,
  faqs,
  mentoringPrices,
  inputRef,
}: {
  programs: ProgramSummary[];
  faqs: FaqItem[];
  mentoringPrices: MentoringPrices | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations('Chat');
  const chipLabel = useChipLabel();
  const { chat, choose, ask } = useChat(programs, faqs);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLOListElement>(null);
  const inputId = useId();

  // Focus the question box when the panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  // Keep the newest message in view.
  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [chat.messages.length]);

  const submit = (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    ask(question);
    setDraft('');
  };

  return (
    <>
      {/* The log wraps a real list: role="log" on the list itself would hide its items. */}
      <div
        role="log"
        aria-live="polite"
        aria-label={t('log')}
        className="min-h-48 flex-1 overflow-y-auto bg-cream px-4 py-4"
      >
        <ol ref={logRef} className="flex flex-col gap-3">
          {chat.messages.map((message, index) => (
            <ChatBubble
              // The conversation only grows, so the position is a stable key.
              key={index}
              message={message}
              content={{ programs, faqs, mentoringPrices }}
            />
          ))}
        </ol>
      </div>

      <div className="border-t border-border bg-white px-4 pt-3 pb-2">
        <ul className="flex flex-wrap gap-2">
          {chat.chips.map((chip) => {
            const label = chipLabel(chip);
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    choose(chip);
                    inputRef.current?.focus();
                  }}
                  className="min-h-10 rounded-full border border-ink/30 px-3.5 text-sm font-semibold text-ink hover:border-crimson-700 hover:bg-crimson-50"
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>

        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            {t('inputLabel')}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={draft}
            maxLength={MAX_QUESTION_LENGTH}
            autoComplete="off"
            placeholder={t('placeholder')}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            className="min-h-11 min-w-0 flex-1 rounded-full border border-ink/30 bg-cream px-4 text-sm text-ink placeholder:text-ink-muted"
          />
          <button
            type="submit"
            className={cn(
              'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-crimson-700 text-white hover:bg-crimson-800',
            )}
          >
            <SendIcon className="size-5 rtl:-scale-x-100" />
            <span className="sr-only">{t('send')}</span>
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-ink-muted">{t('footer')}</p>
      </div>
    </>
  );
}
