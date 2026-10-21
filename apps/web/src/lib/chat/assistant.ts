import {
  type FaqItem,
  PROGRAM_LEVELS,
  PROGRAM_SUBJECTS,
  type ProgramLevel,
  type ProgramSubject,
  type ProgramSummary,
} from '@eta/shared';

/**
 * Scripted chat assistant (no AI): every answer comes from the site's own data
 * — programs, start dates, FAQ, mentoring prices. Program prices are never part
 * of the data it gets, so it cannot show them. Pure functions, no UI.
 */

export const TOPICS = ['fit', 'prices', 'dates', 'person', 'mentoring'] as const;
export type Topic = (typeof TOPICS)[number];

export type Chip =
  | { kind: 'topic'; topic: Topic }
  | { kind: 'level'; level: ProgramLevel }
  | { kind: 'subject'; subject: ProgramSubject | null }
  | { kind: 'startOver' };

/** Bot replies are structured; the UI turns them into translated text and links. */
export type BotReply =
  | { kind: 'text'; key: 'greeting' | 'ask' | 'askLevel' | 'askSubject' | 'notUnderstood' }
  | { kind: 'fit'; slugs: string[] }
  | { kind: 'prices' }
  | { kind: 'dates'; slugs: string[] }
  | { kind: 'person' }
  | { kind: 'mentoring' }
  | { kind: 'faq'; faqKey: string };

export type ChatMessage =
  ({ from: 'bot' } & BotReply) | { from: 'user'; text: string } | { from: 'user'; chip: Chip };

export interface ChatState {
  messages: ChatMessage[];
  /** Suggested replies under the conversation. */
  chips: Chip[];
  /** Level picked in "Which program fits me?", until a subject is picked. */
  level: ProgramLevel | null;
}

export interface ChatData {
  programs: ProgramSummary[];
  faqs: FaqItem[];
  /** Phrases per topic in the page language (from the messages files). */
  keywords: Record<Topic, string[]>;
}

const topic = (name: Topic): Chip => ({ kind: 'topic', topic: name });
export const MAIN_CHIPS: Chip[] = [topic('fit'), topic('prices'), topic('dates'), topic('person')];

/** What to offer after each kind of answer. */
const NEXT_CHIPS: Record<Topic, Chip[]> = {
  fit: [topic('person'), topic('dates'), { kind: 'startOver' }],
  prices: [topic('person'), topic('mentoring'), topic('fit')],
  dates: [topic('person'), topic('fit')],
  person: [topic('fit'), topic('dates')],
  mentoring: [topic('prices'), topic('person')],
};

const MAX_RESULTS = 3;

export function initialChat(): ChatState {
  return {
    messages: [
      { from: 'bot', kind: 'text', key: 'greeting' },
      { from: 'bot', kind: 'text', key: 'ask' },
    ],
    chips: MAIN_CHIPS,
    level: null,
  };
}

/** The visitor tapped a suggested reply. */
export function answerChip(state: ChatState, chip: Chip, data: ChatData): ChatState {
  const asked: ChatMessage = { from: 'user', chip };
  if (chip.kind === 'startOver') return initialChat();
  if (chip.kind === 'level') {
    return {
      messages: [...state.messages, asked, { from: 'bot', kind: 'text', key: 'askSubject' }],
      chips: [
        ...subjectsOffered(data.programs).map((subject): Chip => ({ kind: 'subject', subject })),
        { kind: 'subject', subject: null },
      ],
      level: chip.level,
    };
  }
  if (chip.kind === 'subject') {
    const slugs = recommend(data.programs, state.level, chip.subject);
    return reply(state, asked, { kind: 'fit', slugs }, NEXT_CHIPS.fit);
  }
  return answerTopic(state, asked, chip.topic, data);
}

/** The visitor typed a question. */
export function answerText(state: ChatState, text: string, data: ChatData): ChatState {
  const asked: ChatMessage = { from: 'user', text };
  const words = tokens(text);
  const faq = bestFaq(words, data.faqs);
  if (faq && faq.score >= 2)
    return reply(state, asked, { kind: 'faq', faqKey: faq.key }, MAIN_CHIPS);

  const found = TOPICS.find((name) => matchesAny(text, data.keywords[name]));
  // "Which program fits me?" asks follow-up questions; the others answer straight away.
  if (found) return answerTopic(state, asked, found, data);
  if (faq) return reply(state, asked, { kind: 'faq', faqKey: faq.key }, MAIN_CHIPS);
  return reply(state, asked, { kind: 'text', key: 'notUnderstood' }, MAIN_CHIPS);
}

function answerTopic(state: ChatState, asked: ChatMessage, name: Topic, data: ChatData) {
  switch (name) {
    case 'fit':
      return {
        messages: [
          ...state.messages,
          asked,
          { from: 'bot', kind: 'text', key: 'askLevel' } as const,
        ],
        chips: PROGRAM_LEVELS.map((level): Chip => ({ kind: 'level', level })),
        level: null,
      };
    case 'dates':
      return reply(
        state,
        asked,
        { kind: 'dates', slugs: upcoming(data.programs) },
        NEXT_CHIPS.dates,
      );
    case 'prices':
    case 'person':
    case 'mentoring':
      return reply(state, asked, { kind: name }, NEXT_CHIPS[name]);
  }
}

function reply(state: ChatState, asked: ChatMessage, answer: BotReply, chips: Chip[]): ChatState {
  return { messages: [...state.messages, asked, { from: 'bot', ...answer }], chips, level: null };
}

/** Subjects that have at least one program, in the catalog's order. */
function subjectsOffered(programs: ProgramSummary[]): ProgramSubject[] {
  return PROGRAM_SUBJECTS.filter((subject) => programs.some((p) => p.subject === subject));
}

/** Best match first: level and subject, then subject only, then level only. */
export function recommend(
  programs: ProgramSummary[],
  level: ProgramLevel | null,
  subject: ProgramSubject | null,
): string[] {
  const tries = [
    programs.filter((p) => (!level || p.level === level) && (!subject || p.subject === subject)),
    subject ? programs.filter((p) => p.subject === subject) : [],
    level ? programs.filter((p) => p.level === level) : [],
  ];
  const found = tries.find((list) => list.length > 0) ?? [];
  return found.slice(0, MAX_RESULTS).map((p) => p.slug);
}

/** Programs with an open next group, soonest first. */
export function upcoming(programs: ProgramSummary[]): string[] {
  return programs
    .filter((p) => p.nextCohortStart !== null)
    .sort((a, b) => (a.nextCohortStart ?? '').localeCompare(b.nextCohortStart ?? ''))
    .slice(0, MAX_RESULTS + 1)
    .map((p) => p.slug);
}

/**
 * Arabic writes "the" (ال) and some prepositions as part of the word: "الأسعار" is
 * "the prices". Dropped before matching so "أسعار" finds it too.
 */
const ARABIC_PREFIX = /(^| )(?:وال|بال|فال|كال|لل|ال)(?=\p{L}{2})/gu;

/** Lower-case words of any script (Arabic, Hebrew, Latin), without punctuation. */
function normalize(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return ` ${words.replace(ARABIC_PREFIX, '$1')} `;
}

function tokens(text: string): string[] {
  return normalize(text)
    .trim()
    .split(' ')
    .filter((word) => word.length >= 4);
}

/** True when the text contains one of the phrases as whole words. */
export function matchesAny(text: string, phrases: string[]): boolean {
  const haystack = normalize(text);
  return phrases.some((phrase) => {
    const needle = normalize(phrase);
    return needle.trim() !== '' && haystack.includes(needle);
  });
}

/** The FAQ sharing the most meaningful words with the question, if any. */
function bestFaq(words: string[], faqs: FaqItem[]): { key: string; score: number } | null {
  let best: { key: string; score: number } | null = null;
  for (const faq of faqs) {
    const question = new Set(tokens(faq.question));
    const score = new Set(words.filter((word) => question.has(word))).size;
    if (score > 0 && (!best || score > best.score)) best = { key: faq.key, score };
  }
  return best;
}

/** "a, b, c" from the messages file → ["a", "b", "c"]. */
export const parseKeywords = (list: string) =>
  list
    .split(',')
    .map((phrase) => phrase.trim())
    .filter(Boolean);
