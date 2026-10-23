// Mock endpoints for enrollment, the instructor area, notifications and the
// live notification stream (Server-Sent Events). Used by mock-api.mjs.

const FSA03 = 'c0000000-0000-4000-8000-000000000003';
const FSA04 = 'c0000000-0000-4000-8000-000000000004';
const PROGRAM = 'b0000000-0000-4000-8000-000000000001';
const MODULE3 = 'b0000000-0000-4000-8000-000000000003';
const LESSON_DONE = 'd0000000-0000-4000-8000-000000000011';
const LESSON_EDIT = 'd0000000-0000-4000-8000-000000000012';
const LESSON_READY = 'd0000000-0000-4000-8000-000000000013';
const SUBMISSION = 'f0000000-0000-4000-8000-000000000001';
const THREAD = 'e1000000-0000-4000-8000-000000000001';
const MAYA = {
  userId: '99999999-9999-4999-8999-999999999999',
  firstName: 'Maya',
  lastName: 'Rizk',
};
const DANIA = {
  userId: '88888888-8888-4888-8888-888888888888',
  firstName: 'Dania',
  lastName: 'Hih',
};
const RETURNED = 'f0000000-0000-4000-8000-000000000002';
const rubric = [
  { id: 'works', title: 'Works correctly', maxPoints: 60 },
  { id: 'quality', title: 'Code quality', maxPoints: 40 },
];
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

// [first, last, enrollment, attended of 10, status]
const students = [
  ['Sara', 'Mansour', 'confirmed', 10, 'on_track'],
  ['Lina', 'Hamdan', 'confirmed', 8, 'behind'],
  ['Ahmad', 'Zeidan', 'confirmed', 5, 'at_risk'],
  ['Nour', 'Abbas', 'pending', null, null],
].map(([firstName, lastName, status, attended, progress], index) => ({
  enrollmentId: `e000000${index}-0000-4000-8000-000000000000`,
  userId: `a000000${index}-0000-4000-8000-000000000000`,
  firstName,
  lastName,
  status,
  requestedAt: '2030-01-02T10:00:00.000Z',
  confirmedAt: status === 'confirmed' ? '2030-01-03T10:00:00.000Z' : null,
  attendance:
    attended === null
      ? { attended: 0, marked: 0, rate: null }
      : { attended, marked: 10, rate: attended * 10 },
  progress,
  lastActiveAt: status === 'confirmed' ? inMinutes(-60 * 24 * (index + 1)) : null,
}));

const classDays = Array.from({ length: 10 }, (_, i) => day(-1 - i * 3));
const ahmad = students[2];

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
      attendance: { attended: 8, marked: 10, rate: 80 },
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
    stats: { students: 3, pending: 1, sessionsThisWeek: 3, toGrade: 1, averageAttendance: 77 },
    needsAttention: [
      { ...attention(students[2], 'at_risk'), rate: 50 },
      { ...attention(students[1], 'behind'), rate: 80 },
    ],
    toGrade: [
      {
        id: SUBMISSION,
        cohortId: FSA03,
        student: { firstName: 'Lina', lastName: 'Hamdan' },
        title: 'Auth API',
        submittedAt: inMinutes(-60 * 3),
        lateDays: 2,
      },
    ],
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
  [`/api/teach/cohorts/${FSA03}/attendance`]: () => ({
    classes: classDays,
    date: classDays[0],
    students: students
      .filter((student) => student.status === 'confirmed')
      .map(({ userId, firstName, lastName }, index) => ({
        userId,
        firstName,
        lastName,
        status: index === 0 ? 'present' : null,
      })),
  }),
  [`/api/teach/cohorts/${FSA03}/students/${ahmad.userId}`]: () => ({
    student: { userId: ahmad.userId, firstName: 'Ahmad', lastName: 'Zeidan' },
    cohort: cohortRef(FSA03, 'FSA-03', day(-77)),
    enrollment: {
      status: 'confirmed',
      requestedAt: '2030-01-02T10:00:00.000Z',
      confirmedAt: '2030-01-03T10:00:00.000Z',
    },
    attendance: {
      attended: 5,
      marked: 10,
      rate: 50,
      recent: classDays.map((date, index) => ({ date, status: index % 2 ? 'absent' : 'present' })),
    },
    status: 'at_risk',
    lastActiveAt: inMinutes(-60 * 24 * 6),
    mentoringPlan: {
      total: 8,
      used: 2,
      lastSession: { startAt: inMinutes(-60 * 24 * 20), notes: 'Planning the Module 3 API.' },
    },
    notes: [
      {
        id: 'n1',
        body: 'Missed 2 classes because of a new work shift.',
        authorName: 'Dania Hih',
        sharedWithAdmissions: false,
        createdAt: inMinutes(-60 * 24 * 9),
      },
    ],
  }),
  '/api/teach/programs': () => [
    { id: PROGRAM, slug: 'full-stack-advanced-ai', title: program.title, lessonCount: 3 },
  ],
  [`/api/teach/programs/${PROGRAM}/lessons`]: () => ({
    program: { id: PROGRAM, slug: 'full-stack-advanced-ai', title: program.title, lengthWeeks: 24 },
    videoProvider: 'local',
    modules: [{ id: MODULE3, title: 'Back end & data', weekFrom: 10, weekTo: 14 }],
    lessons: [
      {
        id: LESSON_DONE,
        position: 11,
        title: 'Prisma schema and seed',
        status: 'published',
        moduleId: MODULE3,
        processing: false,
      },
      {
        id: LESSON_EDIT,
        position: 12,
        title: 'Authentication and sessions',
        status: 'draft',
        moduleId: MODULE3,
        processing: true,
      },
      {
        id: LESSON_READY,
        position: 13,
        title: 'Calling AI models',
        status: 'draft',
        moduleId: null,
        processing: false,
      },
    ],
  }),
  [`/api/teach/lessons/${LESSON_EDIT}`]: () =>
    teachLesson(LESSON_EDIT, 12, 'Authentication and sessions', {
      videos: [
        {
          id: 'v1',
          fileName: 'auth-sessions-part1.mp4',
          sizeBytes: 1.6 * 1024 ** 3,
          durationSec: 3130,
          status: 'ready',
        },
        {
          id: 'v2',
          fileName: 'auth-sessions-part2.mov',
          sizeBytes: 2.4 * 1024 ** 3,
          durationSec: null,
          status: 'uploading',
        },
      ],
      files: [
        {
          id: 'f1',
          kind: 'material',
          fileName: 'lesson-12-slides.pdf',
          sizeBytes: 3.2 * 1024 ** 2,
          scanStatus: 'clean',
        },
        {
          id: 'f2',
          kind: 'exercise',
          fileName: 'starter-repo.zip',
          sizeBytes: 14 * 1024 ** 2,
          scanStatus: 'scanning',
        },
      ],
      canPublish: false,
    }),
  [`/api/teach/lessons/${LESSON_DONE}`]: () =>
    teachLesson(LESSON_DONE, 11, 'Prisma schema and seed', {
      status: 'published',
      publishedAt: inMinutes(-60 * 24 * 7),
    }),
  [`/api/teach/lessons/${LESSON_READY}`]: () =>
    teachLesson(LESSON_READY, 13, 'Calling AI models', {
      moduleId: null,
      canPublish: true,
    }),
  '/api/me/courses/full-stack-advanced-ai': () => ({
    program: { slug: program.slug, title: program.title },
    cohort: { id: FSA03, name: 'FSA-03', week: 12 },
    progressPercent: 33,
    modules: [
      {
        id: MODULE3,
        title: 'Back end & data',
        lessons: [
          outlineLesson(LESSON_DONE, 11, 'Prisma schema and seed', true),
          outlineLesson(LESSON_EDIT, 12, 'Authentication and sessions', false),
        ],
      },
      {
        id: null,
        title: null,
        lessons: [outlineLesson(LESSON_READY, 13, 'Calling AI models', false, 14)],
      },
    ],
  }),
  [`/api/me/lessons/${LESSON_DONE}`]: () =>
    studentLesson(LESSON_DONE, 11, 'Prisma schema and seed', { completed: true }),
  [`/api/me/lessons/${LESSON_EDIT}`]: () =>
    studentLesson(LESSON_EDIT, 12, 'Authentication and sessions', {
      videos: [{ id: 'v1', durationSec: 3130, playback: { kind: 'file', url: '/media/demo.mp4' } }],
      files: [
        {
          id: 'f1',
          kind: 'material',
          fileName: 'lesson-12-slides.pdf',
          sizeBytes: 3.2 * 1024 ** 2,
        },
        { id: 'f2', kind: 'exercise', fileName: 'starter-repo.zip', sizeBytes: 14 * 1024 ** 2 },
      ],
      positionSec: 600,
    }),
  [`/api/teach/lessons/${LESSON_EDIT}/assignment`]: () => ({
    assignment: {
      id: 'a1',
      lessonId: LESSON_EDIT,
      title: 'Auth API',
      instructions: 'Add sign-in and protected routes.',
      dueWeek: 12,
      rubric,
      submissionCount: 2,
    },
  }),
  [`/api/teach/lessons/${LESSON_DONE}/assignment`]: () => ({ assignment: null }),
  [`/api/teach/lessons/${LESSON_READY}/assignment`]: () => ({ assignment: null }),
  [`/api/teach/cohorts/${FSA03}/submissions`]: () => ({
    cohort: { id: FSA03, name: 'FSA-03' },
    counts: { toGrade: 1, returned: 1 },
    items: [submissionSummary(SUBMISSION, students[1], 'submitted', null, 2)],
  }),
  [`/api/teach/submissions/${SUBMISSION}`]: () => ({
    ...submissionSummary(SUBMISSION, students[1], 'submitted', null, 2),
    cohort: { id: FSA03, name: 'FSA-03' },
    dueAt: inMinutes(-60 * 50),
    repoUrl: 'https://github.com/lina/auth-api',
    note: 'Refresh tokens are in the second commit.',
    files: [{ id: 'sf1', fileName: 'notes.pdf', sizeBytes: 240 * 1024, scanStatus: 'clean' }],
    rubric,
    scores: rubric.map((criterion) => ({ criterionId: criterion.id, points: null, comment: '' })),
    feedback: '',
    gradedAt: null,
    returnedAt: null,
  }),
  [`/api/me/lessons/${LESSON_EDIT}/assignment`]: () => ({
    assignment: {
      id: 'a1',
      title: 'Auth API',
      instructions: 'Add sign-in and protected routes.',
      dueAt: inMinutes(60 * 24 * 3),
      rubric,
      submission: null,
    },
  }),
  [`/api/me/lessons/${LESSON_DONE}/assignment`]: () => ({
    assignment: {
      id: 'a0',
      title: 'Seed script',
      instructions: '',
      dueAt: inMinutes(-60 * 24 * 7),
      rubric,
      submission: {
        id: RETURNED,
        repoUrl: 'https://github.com/maya/seed',
        note: '',
        submittedAt: inMinutes(-60 * 24 * 6),
        lateDays: 1,
        status: 'returned',
        files: [],
        grade: {
          score: 88,
          scores: [
            { criterionId: 'works', points: 55, comment: 'Seeds run twice safely.' },
            { criterionId: 'quality', points: 33, comment: '' },
          ],
          feedback: 'Great work.',
          returnedAt: inMinutes(-60 * 24 * 2),
        },
      },
    },
  }),
  '/api/messages/recipients': ({ session }) =>
    session === 'instructor'
      ? [{ kind: 'person', ...MAYA, context: 'FSA-03' }]
      : [
          { kind: 'person', ...DANIA, context: 'Full Stack Advanced with AI · FSA-03' },
          { kind: 'team', team: 'support' },
          { kind: 'team', team: 'payments' },
        ],
  '/api/messages/conversations': ({ session }) => ({
    items: [
      {
        id: THREAD,
        kind: 'direct',
        counterpart: counterpart(session),
        student: MAYA,
        subject: 'Lesson 12: Authentication and sessions',
        lastMessage: {
          body: 'Use a rotating refresh token.',
          fromMe: session === 'instructor',
          createdAt: inMinutes(-30),
        },
        unread: session === 'instructor' ? 0 : 1,
      },
    ],
    unread: session === 'instructor' ? 0 : 1,
  }),
  [`/api/messages/conversations/${THREAD}`]: ({ session }) => ({
    id: THREAD,
    kind: 'direct',
    counterpart: counterpart(session),
    student: MAYA,
    subject: 'Lesson 12: Authentication and sessions',
    readByOthersAt: inMinutes(-5),
    messages: [
      threadMessage('m1', MAYA, session !== 'instructor', 'How do refresh tokens rotate?', -90),
      {
        ...threadMessage(
          'm2',
          DANIA,
          session === 'instructor',
          'Use a rotating refresh token.',
          -30,
        ),
        attachments: [
          {
            id: 'e2000000-0000-4000-8000-000000000001',
            fileName: 'diagram.png',
            sizeBytes: 52_000,
            scanStatus: 'clean',
          },
        ],
      },
    ],
  }),
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

function attention(student, status) {
  const { userId, firstName, lastName } = student;
  return { userId, firstName, lastName, cohortId: FSA03, cohortName: 'FSA-03', status };
}

function counterpart(session) {
  return session === 'instructor'
    ? { kind: 'person', role: 'student', ...MAYA }
    : { kind: 'person', role: 'staff', ...DANIA };
}

function threadMessage(id, sender, fromMe, body, minutes) {
  return { id, sender, fromMe, body, attachments: [], createdAt: inMinutes(minutes) };
}

function submissionSummary(id, student, status, score, lateDays) {
  return {
    id,
    student: { userId: student.userId, firstName: student.firstName, lastName: student.lastName },
    assignment: { id: 'a1', title: 'Auth API', lessonPosition: 12 },
    submittedAt: inMinutes(-60 * 3),
    lateDays,
    status,
    score,
  };
}

function outlineLesson(id, position, title, completed, lockedUntilWeek = null) {
  return { id, position, title, completed, lockedUntilWeek };
}

function studentLesson(id, position, title, extra) {
  return {
    id,
    position,
    title,
    about: 'In this lesson you add sign-in to the Module 3 API.',
    program: { slug: program.slug, title: program.title },
    instructor: DANIA,
    videos: [],
    files: [],
    completed: false,
    positionSec: 0,
    previousLessonId: null,
    nextLessonId: null,
    ...extra,
  };
}

function teachLesson(id, position, title, extra) {
  return {
    id,
    programId: PROGRAM,
    position,
    title,
    about: 'In this lesson you add sign-in to the Module 3 API.',
    moduleId: MODULE3,
    availableFromWeek: 12,
    status: 'draft',
    publishedAt: null,
    updatedAt: inMinutes(-2),
    videos: [],
    files: [],
    canPublish: true,
    ...extra,
  };
}
