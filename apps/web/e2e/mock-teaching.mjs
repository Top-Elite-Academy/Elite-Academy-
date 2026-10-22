// Mock endpoints for enrollment, the instructor area, notifications and the
// live notification stream (Server-Sent Events). Used by mock-api.mjs.

const FSA03 = 'c0000000-0000-4000-8000-000000000003';
const FSA04 = 'c0000000-0000-4000-8000-000000000004';
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const inMinutes = (n) => new Date(Date.now() + n * 60_000).toISOString();

const program = {
  slug: 'full-stack-advanced-ai',
  title: 'Full Stack Advanced with AI',
  lengthWeeks: 24,
};
const schedule = { days: ['sun', 'wed'], from: '18:00', to: '21:00' };
const cohortRef = (id, name, startDate) => ({ id, name, startDate, schedule, program });

const running = {
  ...cohortRef(FSA03, 'FSA-03', day(-77)),
  status: 'running',
  seatsTotal: 20,
  confirmed: 3,
  pending: 1,
  week: { current: 12, total: 24 },
};
const upcoming = {
  ...cohortRef(FSA04, 'FSA-04', '2030-11-09'),
  status: 'open',
  seatsTotal: 20,
  confirmed: 0,
  pending: 0,
  week: null,
};

const announcement = {
  id: 'a0000000-0000-4000-8000-000000000001',
  cohortId: FSA03,
  title: 'Week 12 materials are up',
  body: 'Slides and the starter repo are in the lesson page.',
  authorName: 'Dania Hih',
  createdAt: inMinutes(-90),
};

const students = [
  ['Sara', 'Mansour', 'confirmed'],
  ['Lina', 'Hamdan', 'confirmed'],
  ['Ahmad', 'Zeidan', 'confirmed'],
  ['Nour', 'Abbas', 'pending'],
].map(([firstName, lastName, status], index) => ({
  enrollmentId: `e000000${index}-0000-4000-8000-000000000000`,
  userId: `u000000${index}-0000-4000-8000-000000000000`,
  firstName,
  lastName,
  status,
  requestedAt: '2030-01-02T10:00:00.000Z',
  confirmedAt: status === 'confirmed' ? '2030-01-03T10:00:00.000Z' : null,
}));

export const instructor = {
  id: '88888888-8888-4888-8888-888888888888',
  email: 'dania@example.com',
  firstName: 'Dania',
  lastName: 'Hih',
  roles: ['instructor'],
  locale: 'en',
  timeZone: 'Asia/Jerusalem',
  totpEnabled: true,
};

const liveNotification = {
  id: 'n0000000-0000-4000-8000-000000000002',
  type: 'announcement',
  data: {
    cohortId: FSA03,
    cohortName: 'FSA-03',
    title: 'Class moved to 19:00',
    announcementId: 'x',
  },
  readAt: null,
  createdAt: inMinutes(0),
};

/** GET routes by path (or path + query). */
export const teachingRoutes = {
  '/api/me/enrollments': () => [
    {
      id: 'e0000000-0000-4000-8000-000000000009',
      status: 'confirmed',
      cohort: cohortRef(FSA03, 'FSA-03', day(-77)),
      instructorName: 'Dania Hih',
      announcements: [announcement],
    },
  ],
  '/api/me/available-cohorts': () => [cohortRef(FSA04, 'FSA-04', '2030-11-09')],
  '/api/notifications': () => ({
    items: [
      {
        id: 'n0000000-0000-4000-8000-000000000001',
        type: 'enrollment_confirmed',
        data: { cohortId: FSA03, cohortName: 'FSA-03', programTitle: program.title },
        readAt: null,
        createdAt: inMinutes(-60 * 24),
      },
    ],
    unread: 1,
  }),
  '/api/teach/today': () => ({
    cohorts: [running, upcoming],
    stats: { students: 3, pending: 1, sessionsThisWeek: 3 },
    schedule: [
      {
        kind: 'liveClass',
        startAt: inMinutes(60),
        endAt: inMinutes(240),
        title: 'FSA-03 · Full Stack Advanced with AI',
        cohortId: FSA03,
        bookingId: null,
        service: null,
      },
      {
        kind: 'mentoring',
        startAt: inMinutes(60 * 24 + 30),
        endAt: inMinutes(60 * 25 + 30),
        title: 'Nour Abbas',
        cohortId: null,
        bookingId: 'b1',
        service: 'mentoring-8',
      },
    ],
    announcements: [announcement],
  }),
  '/api/teach/cohorts': () => [running, upcoming],
  [`/api/teach/cohorts/${FSA03}`]: () => running,
  [`/api/teach/cohorts/${FSA03}/students`]: () => students,
  [`/api/teach/cohorts/${FSA03}/announcements`]: () => [announcement],
  '/api/teach/availability': () => ({
    windows: [
      { weekday: 1, startTime: '16:00', endTime: '18:00' },
      { weekday: 4, startTime: '16:00', endTime: '18:00' },
    ],
    breakMinutes: 15,
    minNoticeHours: 24,
    sessionMinutes: 60,
    timeOff: [
      {
        id: 't0000000-0000-4000-8000-000000000001',
        startDate: '2030-12-29',
        endDate: '2030-12-31',
      },
    ],
    liveClasses: [
      { weekday: 0, startTime: '18:00', endTime: '21:00' },
      { weekday: 3, startTime: '18:00', endTime: '21:00' },
    ],
    booked: [],
  }),
  '/api/teach/sessions': () => ({
    upcoming: [
      mentorSession('m0000000-0000-4000-8000-000000000001', 'Maya', 'Rizk', 60 * 26, {
        number: 5,
        total: 8,
      }),
    ],
    needsNotes: [
      mentorSession('m0000000-0000-4000-8000-000000000002', 'Sara', 'Mansour', -60 * 20, {
        number: 4,
        total: 8,
      }),
    ],
  }),
};

function mentorSession(id, firstName, lastName, startIn, planPosition) {
  return {
    id,
    kind: 'instructor',
    service: 'mentoring-8',
    student: { firstName, lastName },
    startAt: inMinutes(startIn),
    endAt: inMinutes(startIn + 60),
    status: 'confirmed',
    planPosition,
    joinUrl: null,
    notes: null,
  };
}

/** Sends one live notification shortly after the stream opens, then keeps it open. */
export function notificationStream(response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  response.write(': open\n\n');
  const timer = setTimeout(() => {
    response.write(
      `data: ${JSON.stringify({ kind: 'notification', notification: liveNotification })}\n\n`,
    );
  }, 1500);
  response.on('close', () => clearTimeout(timer));
}

export const MOCK_COHORT_ID = FSA03;
