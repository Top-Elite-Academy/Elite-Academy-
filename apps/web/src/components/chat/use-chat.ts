'use client';

import type { FaqItem, ProgramSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  answerChip,
  answerText,
  type Chip,
  type ChatData,
  initialChat,
  parseKeywords,
  TOPICS,
  type Topic,
} from '@/lib/chat/assistant';

/** The conversation, with the keyword lists of the page language. */
export function useChat(programs: ProgramSummary[], faqs: FaqItem[]) {
  const t = useTranslations('Chat.keywords');
  const data = useMemo<ChatData>(
    () => ({
      programs,
      faqs,
      keywords: Object.fromEntries(
        TOPICS.map((topic) => [topic, parseKeywords(t(topic))]),
      ) as Record<Topic, string[]>,
    }),
    [programs, faqs, t],
  );
  const [chat, setChat] = useState(initialChat);

  return {
    chat,
    choose: (chip: Chip) => {
      setChat((state) => answerChip(state, chip, data));
    },
    ask: (text: string) => {
      setChat((state) => answerText(state, text, data));
    },
  };
}
