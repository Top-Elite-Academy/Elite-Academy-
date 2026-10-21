import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser, createUser } from './helpers/browser';
import { createTestApp, type TestApp, VALID_CAPTCHA } from './helpers/test-app';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.reset();
  await t.prisma.program.create({
    data: {
      slug: 'python-ai',
      title: { en: 'Python with AI', ar: '', he: '' },
      summary: { en: '', ar: '', he: '' },
      level: 'intermediate',
      published: true,
    },
  });
});

const form = (overrides: Record<string, unknown> = {}) => ({
  programSlug: 'python-ai',
  firstName: 'Rana',
  lastName: 'Arafat',
  phone: '050-123-4567',
  days: ['sun', 'tue'],
  hours: ['evening'],
  notes: 'Prefer Arabic',
  consent: true,
  locale: 'ar',
  captchaToken: VALID_CAPTCHA,
  ...overrides,
});

async function submit(body: Record<string, unknown>) {
  const browser = await new Browser(t).open();
  return browser.post('/api/leads/website', body);
}

describe('POST /api/leads/website (spec §3.6)', () => {
  it('creates a New lead with owner, consent proof, timeline event and a 24h first-call task', async () => {
    const sales = await createUser(t, { email: 'dania@test.dev', roles: ['sales'] });

    const response = await submit(form());
    expect(response.status).toBe(202);

    const lead = await t.prisma.lead.findUniqueOrThrow({
      where: { phone: '+972501234567' },
      include: { consents: true, activities: true, tasks: true },
    });
    expect(lead).toMatchObject({
      source: 'website_form',
      stage: 'new',
      ownerId: sales.id,
      availability: { days: ['sun', 'tue'], hours: ['evening'] },
    });
    expect(lead.consents[0]).toMatchObject({
      type: 'contact',
      textVersion: 'contact-2026-10',
      text: expect.stringContaining('واتساب'),
    });
    expect(lead.consents[0]?.ip).toBeTruthy();
    expect(lead.activities.map((a) => a.notes)).toEqual(['lead.createdFromWebsiteForm']);

    const task = lead.tasks[0]!;
    expect(task.assigneeId).toBe(sales.id);
    const hoursUntilDue = (task.dueAt.getTime() - Date.now()) / 3_600_000;
    expect(hoursUntilDue).toBeGreaterThan(23.9);
    expect(hoursUntilDue).toBeLessThanOrEqual(24);
  });

  it('merges a second form from the same phone instead of creating a duplicate', async () => {
    await submit(form());
    await submit(form({ phone: '+972 50 123 4567', firstName: 'Rana', notes: 'Second time' }));

    const leads = await t.prisma.lead.findMany({
      include: { activities: true, tasks: true, consents: true },
    });
    expect(leads).toHaveLength(1);
    expect(leads[0]?.notes).toBe('Second time');
    expect(leads[0]?.activities).toHaveLength(2);
    expect(leads[0]?.consents).toHaveLength(2);
    expect(leads[0]?.tasks).toHaveLength(1); // still one open first-call task
  });

  it('spreads new leads across sales people', async () => {
    const dania = await createUser(t, { email: 'dania@test.dev', roles: ['sales'] });
    const rana = await createUser(t, { email: 'rana@test.dev', roles: ['sales', 'instructor'] });
    await submit(form({ phone: '0501111111' }));
    await submit(form({ phone: '0502222222' }));

    const owners = (await t.prisma.lead.findMany()).map((lead) => lead.ownerId).sort();
    expect(owners).toEqual([dania.id, rana.id].sort());
  });

  it('rejects missing consent and invalid fields with translation keys', async () => {
    const response = await submit(form({ consent: false, phone: '123', days: [] }));
    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toMatchObject({
      consent: ['consent.required'],
      phone: ['phone.invalid'],
      days: ['days.required'],
    });
    expect(await t.prisma.lead.count()).toBe(0);
  });

  it('requires the bot check', async () => {
    const response = await submit(form({ captchaToken: 'wrong' }));
    expect(response.body.code).toBe('captcha.required');
    expect(await t.prisma.lead.count()).toBe(0);
  });

  it('silently drops honeypot submissions', async () => {
    const response = await submit(form({ website: 'http://spam.example' }));
    expect(response.status).toBe(202);
    expect(await t.prisma.lead.count()).toBe(0);
  });

  it('rejects unpublished programs and ignores a cohort of another program', async () => {
    expect((await submit(form({ programSlug: 'secret' }))).body.code).toBe('program.invalid');

    const other = await t.prisma.program.create({
      data: { slug: 'other', title: {}, summary: {}, level: 'beginner', published: true },
    });
    const cohort = await t.prisma.cohort.create({
      data: { programId: other.id, name: 'x', startDate: new Date(), seatsTotal: 10 },
    });
    await submit(form({ cohortId: cohort.id }));
    expect((await t.prisma.lead.findFirstOrThrow()).cohortId).toBeNull();
  });

  it('allows 5 forms per IP per hour', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await submit(form({ phone: `05000000${10 + i}` }))).status).toBe(202);
    }
    expect((await submit(form({ phone: '0500000099' }))).status).toBe(429);
  });
});
