/**
 * Development-only accounts (pnpm db:seed:dev). Never used in production.
 * Instructor accounts are linked to the real instructor profiles so their
 * programs and cohorts appear in the instructor area.
 */
export const INSTRUCTOR_ACCOUNTS = [
  { email: 'dania@elitetech.local', firstName: 'Dania', lastName: 'Hih', mentorSlug: 'dania-hih' },
  {
    email: 'rana@elitetech.local',
    firstName: 'Rana',
    lastName: 'Arafat',
    mentorSlug: 'rana-arafat',
  },
] as const;

/** Example students; the last two only ask to join the next cohort (pending). */
export const EXAMPLE_STUDENTS = [
  { email: 'maya.student@elitetech.local', firstName: 'Maya', lastName: 'Rizk' },
  { email: 'sara.student@elitetech.local', firstName: 'Sara', lastName: 'Mansour' },
  { email: 'lina.student@elitetech.local', firstName: 'Lina', lastName: 'Hamdan' },
  { email: 'ahmad.student@elitetech.local', firstName: 'Ahmad', lastName: 'Zeidan' },
  { email: 'nour.student@elitetech.local', firstName: 'Nour', lastName: 'Abbas' },
  { email: 'jad.student@elitetech.local', firstName: 'Jad', lastName: 'Saliba' },
] as const;
