import type { ProgramSummary } from '@eta/shared';
import { describe, expect, it } from 'vitest';
import {
  answerChip,
  answerText,
  type ChatData,
  initialChat,
  MAIN_CHIPS,
  matchesAny,
  recommend,
  upcoming,
} from './assistant';

const program = (
  slug: string,
  level: ProgramSummary['level'],
  subject: ProgramSummary['subject'],
  nextCohortStart: string | null = null,
) => ({ slug, level, subject, nextCohortStart }) as ProgramSummary;

const PROGRAMS = [
  program('web-basics', 'beginner', 'web', '2030-03-01'),
  program('full-stack', 'advanced', 'web', '2030-01-10'),
  program('data', 'beginner', 'data'),
  program('devops', 'intermediate', 'devops', '2030-02-01'),
];

const DATA: ChatData = {
  programs: PROGRAMS,
  faqs: [
    { key: 'certificate', question: 'Do I get a certificate at the end?', answer: 'Yes.' },
    { key: 'experience', question: 'Do I need prior experience?', answer: 'No.' },
  ],
  keywords: {
    fit: ['which program', 'fit'],
    prices: ['price', 'how much', 'installments', 'أسعار'],
    dates: ['when', 'start'],
    person: ['advisor', 'talk'],
    mentoring: ['mentoring', 'cv'],
  },
};

const last = (state: ReturnType<typeof initialChat>) => state.messages.at(-1);

describe('chat assistant', () => {
  it('greets and offers the four main topics', () => {
    const chat = initialChat();
    expect(chat.messages.map((m) => m.from)).toEqual(['bot', 'bot']);
    expect(chat.chips).toEqual(MAIN_CHIPS);
  });

  it('"Which program fits me?" asks level, then subject, then recommends', () => {
    let chat = answerChip(initialChat(), { kind: 'topic', topic: 'fit' }, DATA);
    expect(last(chat)).toMatchObject({ kind: 'text', key: 'askLevel' });
    expect(chat.chips.map((c) => (c.kind === 'level' ? c.level : null))).toEqual([
      'beginner',
      'intermediate',
      'advanced',
    ]);

    chat = answerChip(chat, { kind: 'level', level: 'beginner' }, DATA);
    expect(last(chat)).toMatchObject({ key: 'askSubject' });
    // Only subjects that have programs (no "ai" here), plus "not sure".
    expect(chat.chips.map((c) => (c.kind === 'subject' ? c.subject : '?'))).toEqual([
      'web',
      'data',
      'devops',
      null,
    ]);

    chat = answerChip(chat, { kind: 'subject', subject: 'web' }, DATA);
    expect(last(chat)).toEqual({ from: 'bot', kind: 'fit', slugs: ['web-basics'] });
    expect(chat.messages.filter((m) => m.from === 'user')).toHaveLength(3);
  });

  it('recommends by level and subject, then subject, then level', () => {
    expect(recommend(PROGRAMS, 'beginner', null)).toEqual(['web-basics', 'data']);
    expect(recommend(PROGRAMS, 'advanced', 'data')).toEqual(['data']);
    expect(recommend(PROGRAMS, null, null)).toHaveLength(3);
  });

  it('lists the next start dates, soonest first', () => {
    expect(upcoming(PROGRAMS)).toEqual(['full-stack', 'devops', 'web-basics']);
  });

  it('understands typed questions by keywords and FAQ, in any script', () => {
    const ask = (text: string) => last(answerText(initialChat(), text, DATA));
    expect(ask('How much does it cost?')).toMatchObject({ kind: 'prices' });
    expect(ask('ما هي الأسعار؟')).toMatchObject({ kind: 'prices' });
    expect(ask('When does the next group start?')).toMatchObject({ kind: 'dates' });
    expect(ask('Can I talk to an advisor')).toMatchObject({ kind: 'person' });
    expect(ask('Will I get a certificate at the end?')).toMatchObject({
      kind: 'faq',
      faqKey: 'certificate',
    });
    expect(ask('banana')).toMatchObject({ kind: 'text', key: 'notUnderstood' });
  });

  it('matches whole words only', () => {
    expect(matchesAny('whenever', ['when'])).toBe(false);
    expect(matchesAny('So, when?', ['when'])).toBe(true);
  });

  it('start over returns to the greeting', () => {
    const chat = answerChip(
      answerChip(initialChat(), { kind: 'topic', topic: 'prices' }, DATA),
      { kind: 'startOver' },
      DATA,
    );
    expect(chat).toEqual(initialChat());
  });
});
