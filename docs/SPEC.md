# Elite Tech Academy — Platform Specification

Oct 21, 2026 · @dania hih

## 1. Overview

Elite Tech Academy's platform is one product with three faces: a public website that turns visitors into leads, a student area where enrolled students learn, and a staff back office (admin + CRM) where the team runs admissions and operations. This spec describes every screen in the design canvas, what each button does and where it leads, and the security rules the build must follow.

**Goals**

1. Visitors understand the five programs and book a call with an advisor in under 2 minutes, without paying online.
2. Every lead is captured in the CRM, owned by a person and followed up within 24 hours.
3. Students watch lessons, join live classes, book mentoring and pay for mentoring in one place.
4. Staff run courses, cohorts, bookings, payments and success stories without a developer.

**Programs on the platform**

| Program | Length | Instructor |
| --- | --- | --- |
| Full Stack Diploma | 1 year | TBD |
| Full Stack Advanced with AI | 6 months (24 weeks) | Dania Hih |
| Python with AI | TBD | Dr. Muhammad Wattad |
| Data Analysis with AI | TBD | Rana Arafat |
| DevOps | TBD | TBD |

Every program has a learning stage and a practical stage on a partner company's product, included in the price. Program prices are **not shown on the website**; an advisor discusses price and installments on the call. The only public prices are mentoring: ₪360 per session, 8-session plan ₪2,500.

**User roles**

| Role | Who | Can access |
| --- | --- | --- |
| Visitor | Anyone, not signed in | Public website, chat assistant, enroll form |
| Student | Enrolled learner | Student area: own courses, lessons, sessions, payments, messages, profile |
| Instructor / mentor | Rana, Dania, Dr. Muhammad, career advisors | Own cohorts, students' progress, own sessions, messages |
| Sales / admissions | Dania, Rana (CRM owners) | CRM: leads, pipeline, follow-ups, convert to student |
| Admin | Academy management | Everything, incl. payments, users, roles, settings |

One person can hold several roles (Dania is instructor, sales and admin). Access is decided by role on the server, never by hiding buttons.

**Languages:** Arabic, Hebrew and English. Arabic and Hebrew render right-to-left; English left-to-right. The language menu switches the whole interface; the choice is saved per user.

**Design system:** all screens use the EliteTech design system (crimson, deep navy, gold; crest logo; motto "Scientia et Innovatio"). Developers build the shared components once (header, buttons, course card, mentor card, language menu, icons) and reuse them.

**Out of scope for version 1:** online payment for full programs, a public login link (hidden for now), digital self-paced course sales, and a mobile app (the website is responsive instead).

## 2. Site map and global navigation

The site has three areas, each with its own frame: the public site (top header + footer), the student area (left sidebar) and the staff back office (admin sidebar, CRM sidebar). Suggested URLs are given; the design file name is in brackets.

| Area | Page | Suggested URL | Design board |
| --- | --- | --- | --- |
| Public | Landing | `/` | 1 · Landing page |
| Public | Course catalog | `/courses` | 2 · Course catalog |
| Public | Course details | `/courses/{slug}` | 3 · Course details |
| Public | Syllabus | `/courses/{slug}/syllabus` | Syllabus · Full Stack Advanced with AI |
| Public | Mentoring & career advice | `/mentoring` | 4 · Mentoring |
| Public | Enroll — book a call | `/enroll?program={slug}` | 4b · Enroll |
| Public → sign-in | Mentoring booking flow | `/book` | 5 · Booking flow |
| Student | Dashboard (Overview, My courses, Sessions, Payments, Profile) | `/app`, `/app/courses`, `/app/sessions`, `/app/payments`, `/app/profile` | 6 · Student dashboard |
| Student | Lesson player | `/app/courses/{slug}/lessons/{id}` | 7 · Digital lesson |
| Student | Messages & support | `/app/messages` | 8 · Chat & support |
| Staff | Admin overview and sections | `/admin/...` | 9 · Admin overview |
| Staff | CRM (Dashboard, Leads, Pipeline, Lead profile, Follow-ups, Add lead) | `/crm/...` | CRM 1–6 |
| Legal | Terms of use, Privacy policy, Cancellation & refund policy, Accessibility statement | `/terms`, `/privacy`, `/refunds`, `/accessibility` | Not designed yet |

**Public header (every public page)**

| Element | Action |
| --- | --- |
| Crest logo | Go to Landing (`/`) |
| Courses | Go to Course catalog |
| Mentoring | Go to Mentoring page, mentoring tab selected |
| Career advice | Go to Mentoring page, career-advice tab selected |
| Success stories | Landing, scroll to Stories section (`/#stories`) |
| Language menu | Dropdown: العربية / עברית / English. Switches language and direction, keeps the user on the same page, saves the choice (cookie for visitors, profile for signed-in users) |
| Explore courses (primary button) | Go to Course catalog |
| Log in | Hidden in version 1; when enabled goes to `/login` |

On mobile the links collapse into a menu button that opens a full-screen menu (Mobile · Menu open): Courses, Teacher mentoring, Career advice, Success stories, FAQ, Contact us, plus an Explore courses button. Close returns to the page.

**Public footer (every public page)**

| Column | Links → destination |
| --- | --- |
| Learn | Courses → Catalog · Mentoring → Mentoring · Career advice → Mentoring · FAQ → `/#faq` |
| Help | Help center → Support / help center · Contact us → contact form |
| Legal | Terms of use · Privacy policy · Cancellation & refund policy (pages to be written) |
| Contact | Email (`mailto:`), phone (`tel:`), Instagram, LinkedIn, Facebook (open in a new tab with `rel="noopener noreferrer"`) |

**Chat assistant:** a floating button at the bottom corner of every public page (inline-end side, so it flips in RTL). See section 6.

**Breadcrumbs:** Catalog, Course details and Syllabus show `Home › Courses › {page}`; each crumb links back.

**Unknown URL:** a 404 page with the header, a short message and buttons to Home and Courses. A server error shows a 500 page with no technical details.

## 3. Public website pages

The public site has one job: help a visitor pick a program and leave their details for a call. Each page below lists its sections in order, then every button and where it goes.

### 3.1 Landing page (`/`)

**Sections**

1. **Hero** — eyebrow "Technology academy · Practical learning", title "Start your path into high tech, one clear step at a time", one-line body, the crest with the motto on the side. Buttons: *Explore courses* → Catalog; *Book a mentoring session* → Mentoring.
2. **Our top programs** — three program cards (Data Analysis with AI · Rana Arafat; Full Stack Advanced with AI · Dania Hih; Python with AI · Dr. Muhammad Wattad). Each card shows title, instructor, level, next cohort date and "Includes a practical stage at a company". No price. Whole card → that program's Course details. *View all programs* → Catalog.
3. **Three ways to learn with us** — Live courses (→ Catalog), Teacher mentoring (→ Mentoring, mentoring tab), Career advice (→ Mentoring, career tab).
4. **How it works** — four clickable step cards. Each card is one link with a CTA: 01 Choose your path → *Browse programs* → Catalog; 02 Enroll → *Enroll* → Enroll form; 03 Learn and practice → *Go to the student area* → Student dashboard (sends a signed-out visitor to sign-in first); 04 Get ready for work → *Book career advice* → Mentoring.
5. **Graduate stories** (`#stories`) — quote cards. Only real stories with written consent are published (managed in Admin › Success stories).
6. **Meet your instructors** — three large round photos and a spotlight card below. Hover, focus (keyboard) or click on a photo selects that instructor; the card shows name, program, role and bio. *View the program* → that instructor's Course details. The first instructor (Dania) is selected on load.
7. **FAQ** (`#faq`) — accordion; one question open at a time; *Message support* → Contact / Support.
8. **Closing call to action** — "Not sure where to start?" *Book career advice* → Mentoring booking flow (career advice preselected).
9. **Footer** and **chat assistant** (section 2 and 6).

**Content managed by admin:** top programs (which 3), stories, FAQ, instructor bios and photos. All three languages are edited side by side.

### 3.2 Course catalog (`/courses`)

**Purpose:** see all programs and narrow them down.

| Element | Behaviour |
| --- | --- |
| Breadcrumb Home | → Landing |
| Filters panel: Subject (chips) and Level (Beginner, Intermediate, Advanced) | Multi-select; the list updates instantly; filters are written to the URL query (`?subject=data&level=beginner`) so a filtered list can be shared |
| Clear all / Clear filters | Removes every filter |
| Sort | Starting soonest (default) or Name A–Z |
| Result count | "{n} programs" updates with filters; screen readers announce it |
| Course card | Title, instructor, level, length, next cohort date, "Includes a practical stage at a company". No price |
| *More details* (card) | → Course details for that program |
| *Enroll* (card) | → Enroll form with the program preselected (`/enroll?program={slug}`) |
| Empty state | "No programs match" + Clear filters |
| Side box *Book career advice* | → Mentoring, career tab |

On mobile the filters open in a bottom sheet with an *Apply* button.

### 3.3 Course details (`/courses/{slug}`)

**Layout:** main column on the start side, a **sticky enrollment card** on the end side that stays visible while scrolling (on mobile it becomes a bar fixed to the bottom with the Enroll button).

**In-page tabs** (anchor links that scroll and highlight the current section): Overview · What you'll learn · Curriculum · How you access the lessons · Instructor · FAQ.

| Section | Content |
| --- | --- |
| Overview | Who it is for, level, length, format, the two stages (learning + practical stage at a company) |
| What you'll learn | Outcome bullets |
| Curriculum | Modules as an accordion; each module lists its weeks/topics. Link *View full syllabus* → Syllabus page |
| Schedule and upcoming cohorts | Start date, days and times, seats left per cohort |
| How you access the lessons | Live classes via Zoom, recordings in the student area, materials to download |
| Instructor | Photo, name, short bio |
| Course questions | Program FAQ accordion |

**Sticky enrollment card**

| Element | Behaviour |
| --- | --- |
| Crimson top band | Next start date, schedule, seats left |
| *Choose a cohort* | Radio cards, one per open cohort (name, start date, tag e.g. "Few seats left"). A full cohort is shown disabled with "Full — join waitlist" |
| *Enroll — book a call* | → Enroll form with program and chosen cohort preselected |
| Note | "No payment now. An advisor calls you to go over price and installments." |
| What's included | Live classes, recordings, projects, practical stage at a company, certificate |
| *Have a question first? Message the academy team* | → Contact / Support |

No price is shown on this page.

### 3.4 Syllabus page (`/courses/{slug}/syllabus`)

One syllabus page per program, built from the same data as the PDF (section 6).

| Element | Behaviour |
| --- | --- |
| Header *Apply now* | → Enroll form for this program |
| Breadcrumb Programs › {program} | → Catalog › Course details |
| *Download syllabus (PDF)* | Not on the public page: the PDF is for confirmed students only (see 6.2). The public page invites visitors to *Talk to an advisor* instead |
| *Talk to an advisor* | → Enroll form |
| **24 weeks at a glance** | A week strip (1–24) coloured by module, and module chips. Clicking a week or a module shows that module's detail panel below (title, weeks, topics per week, hands-on task, module project, tools) |
| By the end you can / Before you join / How you are assessed | Outcomes, prerequisites, assessment weights (e.g. projects 25%, module tasks 35%, capstone 25%, participation 15%) |
| *Want extra help along the way?* → *See mentoring* | → Mentoring |

### 3.5 Mentoring & career advice (`/mentoring`)

**Two services, chosen with two large option cards at the top:**

- **Teacher mentoring** — ₪360 per session; one-to-one meetings with a program instructor. Packages: Single session ₪360 · 4 sessions ₪1,350 · **8-session plan ₪2,500 (highlighted, recommended)** · 12 sessions ₪3,700. Packages are on sale: each shows the price of the same sessions one by one, crossed out, and how much it saves (e.g. 8-session plan: ~~₪2,880~~ Save ₪380).
- **Career advice** — a single session with a tech professional (CV review, mock interview, career direction).

Selecting a card switches the list below between program instructors (Rana Arafat, Dania Hih, Dr. Muhammad Wattad) and career advisors. Filters: specialty and session language (Arabic, Hebrew, English). Each mentor card shows photo, name, specialty, languages, "Session length" and *Choose a time* → Booking flow with the service and mentor preselected (`/book?service=mentoring-8&mentor={id}`).

### 3.6 Enroll — book a call (`/enroll`)

**Purpose:** collect a lead and a good time to call. No payment.

**Form fields** (all required unless marked):

| Field | Rules |
| --- | --- |
| Program | Select of the 5 programs; preselected from the URL |
| First name, Last name | 2–50 letters, any of the three scripts |
| Phone | Israeli or international format, validated and stored as E.164 (+972…) |
| Occupation | Free text, max 100 characters (optional) |
| Days | Chips Sunday–Saturday, choose one or more |
| Available hours | Morning 09–12 · Midday 12–15 · Afternoon 15–18 · Evening 18–21, choose one or more |
| Notes | Optional, max 500 characters |
| Consent checkbox | "I agree that Elite Tech Academy may contact me about this program by phone and WhatsApp." Must be ticked; the consent text, time and IP are stored |

*Submit — book my call*: validates on the client and again on the server; errors show under each field and focus moves to the first error. On success:

1. A **lead** is created in the CRM (source "Website form", stage New, program, availability) or merged into an existing lead with the same phone.
2. An owner is assigned (round-robin between Dania and Rana, or by program) and a **first-call task due within 24 hours** is created.
3. The visitor sees "Thank you, {first name}!" with *Read the syllabus meanwhile* → Syllabus and *Back to courses* → Catalog, and gets a WhatsApp/SMS confirmation (if enabled).

Side panel "What happens next": we call you in your chosen time → we explain the program, price and installments → you choose a cohort and register.

Protection: rate limit, bot check and a hidden honeypot field (section 9).

### 3.7 Mentoring booking flow (`/book`)

A 5-step wizard with a progress bar and a booking summary panel (sticky on desktop): **Service → Date & time → Review → Payment → Confirmation**. *Back* returns one step; *Cancel and go back* → Mentoring.

| Step | What the user does | Rules |
| --- | --- | --- |
| 1 Service | Pick: Single mentoring session ₪360 · Mentoring plan · 8 sessions ₪2,500 (with its saving) · Career advice: CV review / mock interview. Then choose a mentor | Price always comes from the server, never from the page |
| 2 Date & time | Pick a day (next 14 days) and a free slot; times in the user's time zone (default Jerusalem) | Only real free slots from the mentor's calendar; a slot is held for 10 minutes while paying |
| 3 Review | Check service, mentor, time, price; *Change* returns to the step; tick "I agree to the cancellation policy and terms" | Must tick to continue |
| 4 Payment | *Pay ₪{price} now* → redirect to the payment provider's hosted page | Sign-in or account creation is required before this step. Card data never touches our servers |
| 5 Confirmation | "Your booking is confirmed", what happens next, *Go to my dashboard* → Dashboard, *Add to calendar* (.ics file), *Message the mentor* → Messages | Confirmed only after the provider's signed webhook says "paid". Email + WhatsApp confirmation and receipt are sent |

Payment failed → the page shows the reason and *Try payment again*; the slot hold is released after 10 minutes. For the 8-session plan the first session is booked now and the remaining 7 credits appear in the dashboard's Mentoring package card.

**Mobile:** the same flow, one step per screen, with a fixed bottom button (Mobile · Booking).

## 4. Student area

The student area is behind sign-in and shows only the signed-in student's own data. Accounts are created by staff when a lead is converted to a student (CRM › Convert to student) or when someone pays for mentoring; the student gets an invitation link to set a password.

### 4.1 Sign-in and account

- **Sign in** with email + password, or a one-time code sent by email (magic link). Google sign-in optional.
- **Forgot password** → email with a single-use link valid 30 minutes. The message never says whether an email exists.
- **Sign out** from the profile menu ends the session on the server.
- Students may turn on two-step verification; staff must (section 9).

### 4.2 Dashboard frame

Left sidebar (right side in RTL): crest → public Landing · **Overview** · **My courses** (badge = active courses) · **Sessions** · **Payments** · **Profile** · *Messages & support* (badge = unread) → Messages · *Message support* → Messages with the support thread open. Top bar: language menu, notifications bell, avatar menu (Profile, Sign out).

### 4.3 Overview (`/app`)

| Card | Content | Buttons → destination |
| --- | --- | --- |
| Welcome | "Welcome back, {first name}", current program progress % | *Continue learning* → last opened lesson |
| Upcoming sessions | Next 3 live classes and mentoring sessions with date, time, mentor | *Join* → Zoom link (active from 15 min before start) · *Reschedule* → booking flow step 2 for that session (allowed until 24 h before) · *Details* → session detail drawer · *View all* → Sessions |
| Mentoring package | "3 of 8 meetings used", progress bar, next meeting | *Book the next meeting* → booking flow with the package credit and mentor preselected (no payment step) |
| Pick up where you left off | Last lesson, thumbnail, time watched | *Continue lesson* → Lesson player at the saved position |
| Messages | Latest 3 threads with unread dot | *Open inbox* → Messages |
| My courses | Each enrolled course with progress | *Continue* → Lesson player · *Details* → Course details |

### 4.4 My courses (`/app/courses`)

Tabs *In progress* / *Completed* with counts. Each course card: title, cohort, instructor, progress bar, stage (Learning / Practical stage), next live class. *Continue* → Lesson player. Empty state: *Browse courses* → public Catalog.

The course page (`/app/courses/{slug}`) shows a **Course syllabus** card (size, last update, *Download PDF*) once the program has a syllabus PDF (6.2).

### 4.5 Sessions (`/app/sessions`)

*Upcoming* and *Past* lists. Upcoming row: type (Live class / Mentoring / Career advice), title, date & time, mentor, *Join*, *Reschedule*, *Cancel*. Cancel asks for confirmation; within 24 h of start it is blocked and shows the policy. A cancelled mentoring session returns the credit to the package. Past row: recording link (if any) and the mentor's notes.

### 4.6 Payments and orders (`/app/payments`)

Table of orders: date, item, amount, status (Paid / Failed / Refunded / Installment {n} of {m}). *Receipt* downloads the tax receipt PDF issued by the invoicing service. *Try again* on a failed payment reopens the hosted payment page. No card numbers are shown or stored — only the last 4 digits and brand as returned by the provider.

### 4.7 Profile and settings (`/app/profile`)

- **Personal details:** first name, last name, phone, email (changing email requires confirming the new address), photo. *Save changes*.
- **Language and notifications:** interface language; time zone (Jerusalem UTC+3 / UTC / other); "Email me a reminder 24 hours before each session"; "News about new courses and cohorts" (marketing — off by default, separate consent).
- **Security:** change password, turn on two-step verification, see active sessions and sign out of all devices.
- **My data:** *Download my data* (JSON/PDF export) and *Request account deletion* (goes to admin for handling under the privacy policy).

### 4.8 Lesson player (`/app/courses/{slug}/lessons/{id}`)

| Area | Behaviour |
| --- | --- |
| Top bar | *Dashboard* ← back to Overview; course title; progress |
| Video | Streamed with adaptive quality (HLS); controls: play, seek, captions (*CC*), speed (*1×* → 0.75–2×), full screen. Position saved every 10 s and on leave. Signed, expiring URL per student (section 9) |
| Title + *Mark as complete* | Toggles to "Completed · Undo". Auto-marks complete at 90% watched |
| *Next lesson* | → next lesson in order |
| Tabs: About this lesson / Downloads / Ask the instructor | Downloads list files with type and size (e.g. lesson summary PDF, exercise CSV, Jupyter notebook) — each a short-lived signed download link. *Ask the instructor* sends a question that opens a thread in Messages (*Send question*, *Open messages*) |
| *Technical problem? Contact support* | → Messages, support thread |
| Course content sidebar | Units and lessons with length and a tick for completed ones; click → that lesson. Locked lessons (future weeks) show a lock |

### 4.9 Messages & support (`/app/messages`)

Two panes: thread list (filters *All* / *Unread*, search) and the open thread. Threads exist with: each instructor/mentor of the student, the Support team and the Payments team. *New message* → choose recipient from that allowed list. Composer: text up to 2,000 characters, attachments (images, PDF, code files up to 10 MB, scanned — section 9), *Send*. Read receipts and a typing indicator are optional. New messages notify by email if unread for 30 minutes. Students cannot message other students privately; the only place classmates talk is the assignment discussion (4.11).

### 4.10 Mobile screens

The website is responsive; four mobile boards show the key layouts:

- **Mobile · Home** — landing reduced to one column; menu button → Mobile menu.
- **Mobile · Menu open** — full-screen menu (section 2).
- **Mobile · Booking** — date/time step with a fixed *Continue to review* button.
- **Mobile · Dashboard** — cards stacked; bottom tab bar: Home · Courses · Sessions · Messages · Account; *Join session* and *Continue lesson* stay at the top.

### 4.11 Assignment discussions (`/app/courses/{slug}/lessons/{id}/discussion/{threadId}`)

Under each exercise in the lesson player, classmates ask and answer questions about it.

- **Who sees it:** the cohort's confirmed students, the program's instructor and admins. Each cohort has its own discussion; other cohorts, pending students and everyone else get *not found*.
- **Questions with replies:** a student opens a question (one-line title up to 120 characters, details up to 4,000); anyone who can see it replies. Posts are plain text; a line with ``` before and after marks a code block (shown left-to-right, never as HTML). No files in v1.
- **Names:** classmates appear as first name and last initial ("Maya R."); the instructor is labelled *Instructor*.
- **Guideline:** shown above the list and the reply box: ask about ideas, errors and approaches; don't post a full solution.
- **Students:** delete their own question or reply (it reads "The author deleted this post"); *Report* someone else's post with an optional reason (once per post).
- **Instructor** (Cohort → *Discussions* tab, `/teach/cohorts/{id}/discussions/{threadId}`): reply, *Pin to top*, *Mark as answer*, remove any post (students see "The instructor removed this post"; the instructor can still read it), see open reports and *Keep* the reported posts. A removed question disappears for students and takes no more replies.
- **Notifications (bell):** the instructor on a new question and on a report; the person who asked on each reply. Classmates are not notified of every post.
- **Order:** pinned questions first, then by latest activity.

## 5. Staff back office: Admin and CRM

Staff screens live under `/admin` and `/crm`, require sign-in with two-step verification, and show only what the staff member's role allows. Both share one account system with the student area.

### 5.1 Admin (`/admin`)

Sidebar sections; each has a page title, *Export* (CSV of the current list, admin only) and one primary action button:

| Section | Shows | Primary action | Other actions |
| --- | --- | --- | --- |
| Overview | Today's bookings, upcoming cohorts (seats taken / total), payments to follow up, success stories to review | Add course | *All bookings* → Bookings · *All payments* → Payments · *Manage stories* → Success stories |
| Courses | Programs, cohorts, modules, lessons, syllabus data, which 3 are "top programs" | Add course | Edit, add cohort, upload lesson video, publish / unpublish, generate syllabus PDF |
| Students | All students, program, cohort, progress, payment status | Add student | Open profile, enroll in cohort, reset 2FA, deactivate |
| Bookings | All mentoring and career sessions | Manual booking | Reschedule, cancel, mark no-show, refund credit |
| Teachers & mentors | Profiles, photos, bios (3 languages), availability calendars, Zoom links | Add mentor | Edit availability, deactivate |
| Payments | Orders, installments, refunds, failed payments | Issue receipt | Refund (admin only, with reason), resend receipt |
| Success stories | Submitted stories with consent status | Add story | *Edit*, *Publish* (only if consent is recorded), unpublish |

Admins also manage **Users & roles** (invite staff, assign roles, force sign-out) and **Settings** (contact details, policies text, WhatsApp templates, assignment rules). Every change in admin is written to the audit log.

### 5.2 CRM frame (`/crm`)

Sidebar: *CRM · Admissions* (home) · **Dashboard** · **Leads** (count badge) · **Pipeline** · **Follow-ups** (badge = open tasks due today or overdue) · **Students** (converted leads). Owners: Dania Hih and Rana Arafat; more can be added.

**Lead stages** (one closed list used everywhere): New → Contacted → Interested → Advice booked → Registered, plus Lost (with a reason: Price, Timing / schedule, Chose another academy, Not a good fit, Could not reach).

### 5.3 Sales dashboard (`/crm`)

- Greeting "Good morning, {name}" and a period switch (This week / This month / This quarter).
- KPI tiles: new leads, contacted within 24 h %, advice sessions booked, registrations, conversion rate.
- **Pipeline funnel** — count per stage and drop-off between stages.
- **Where leads come from** — by source (Facebook, Instagram, Website form, WhatsApp, Referral, Webinar, TikTok).
- **Interest by program** — leads per program.
- **Team** — per owner: open leads, overdue tasks, registrations.
- *Open follow-ups* → Follow-ups. Clicking a funnel stage or source → Leads filtered by it.

### 5.4 Leads (`/crm/leads`)

| Element | Behaviour |
| --- | --- |
| Stage tabs (All, New, Contacted, …) with counts | Filter the table |
| Search + filters | Name/phone search; program, source, owner, "overdue only" |
| Table columns | Name, phone, program, source, stage (coloured chip), owner, last contact, next step (red if overdue, amber if today) |
| Row / name | → Lead profile |
| Checkbox selection → bulk bar | *Assign owner* · *Change stage* · *Send WhatsApp* (approved template only) |
| *Import from Excel* | Upload .xlsx/.csv → map columns → preview → import; duplicates by phone are merged, not doubled. Admin/sales only |
| *New lead* | → Add a lead |

### 5.5 Pipeline (`/crm/pipeline`)

Kanban board with one column per stage (count in the header). Cards show name, program, owner, next step. Drag a card to another column, or use *Move to {next stage}* on the card (keyboard-accessible alternative). Moving to Lost asks for a reason. Card name → Lead profile. *See lost leads* → Leads filtered to Lost. *New lead* → Add a lead.

### 5.6 Lead profile & call log (`/crm/leads/{id}`)

| Area | Behaviour |
| --- | --- |
| Header | Name, stage chip, program, owner. *Leads* breadcrumb → Leads |
| Quick actions | *Call* (`tel:` link + opens a call log entry) · *WhatsApp* (opens `wa.me` or the WhatsApp Business API template) · *Email* · *Book career advice* (staff books a free advice session for the lead) |
| Stage bar | Click a stage to move the lead; Lost asks for the reason |
| **Log a conversation** | Type (Call / WhatsApp / Email / Meeting), outcome (Answered, No answer, Call back later…), notes, next step + date + owner. *Save conversation* adds it to the timeline and creates the follow-up task. *Clear* resets the form |
| **Timeline** | Newest first: calls, messages, stage changes, system events ("Lead created from website form"), with author and time |
| **Details** | Phone, email, occupation, preferred days and hours (from the enroll form), source, consent record. *Edit details* |
| **Next step** | The open task with due date |
| **Turn into a student** | *Convert to student* → choose program + cohort → creates the student account and enrollment, sends the invitation, sets stage Registered |

### 5.7 Follow-ups (`/crm/follow-ups`)

Tasks grouped *Overdue* · *Today* · *Upcoming*. Filter: Me / Rana Arafat / Whole team. Each task: lead name, what to do, due time, *Done* (tick), *Snooze* (1 h / tomorrow / pick a date), *Open lead* → Lead profile. A lead from the website with no contact after 24 h raises an overdue task and notifies the owner.

### 5.8 Add a lead (`/crm/leads/new`)

Sections **Contact** (first name, last name, phone, email, occupation) and **Interest** (program, source, notes), owner (Assign automatically / Dania Hih / Rana Arafat), checkbox "Create a first-call task for the owner, due within 24 hours" (on by default). While typing a phone that already exists, a notice shows "This person is already a lead" with *Open her profile* → that lead. *Save lead* → Lead profile; *Cancel* → Leads.

Side panel **Leads that arrive by themselves**: website enroll form, chat assistant hand-off, Facebook/Instagram lead ads (via webhook), WhatsApp — all land as New with the source set.

## 6. Chat assistant and syllabus PDF / template

### 6.1 Chat assistant (every public page)

**What the user sees:** a round crimson button with a gold ring at the bottom corner. On first visit a small bubble says "Hi! Not sure which program fits you? Ask me." (shown once per session, dismissible). Clicking opens a 372 × 580 panel (full screen on mobile):

- Header: crest, "Elite Tech assistant", status "Online · replies instantly", close button.
- Message list (announced to screen readers as it updates), auto-scrolls to the newest message, "Typing…" indicator.
- Quick replies: *Which program fits me?* · *Prices & installments* · *Next start dates* · *Talk to a person*.
- Input "Ask about programs, dates, mentoring…" + *Send* (Enter also sends).
- Footer "Automated assistant · a person can take over anytime".
- Answers can carry a link button: *See all programs* → Catalog, *Book a call* / *Enroll — book a call* → Enroll form, *See mentoring* → Mentoring, *Talk to an advisor* → Enroll form.

**How it works (version 1 → version 2):**

1. **v1 — scripted:** keyword rules answer the common questions (which program, prices → "an advisor will explain", dates, mentoring ₪360/session, practical stage, talk to a person). No AI cost, no risk.
2. **v2 — AI with retrieval (RAG):** an AI model answers only from an approved knowledge base (program pages, syllabi, FAQ, policies). Rules: never invent prices or dates; never ask for ID numbers or card details; if unsure, offer *Talk to an advisor*. The model runs on the server; the API key is never in the browser.
3. **Hand-off:** "Talk to a person" asks for name + phone + consent inside the chat and creates a CRM lead with source "Chat assistant" and the transcript attached.

**Limits:** 20 messages per visitor per 10 minutes, 500 characters per message, transcripts kept 90 days then deleted unless attached to a lead.

### 6.2 Syllabus PDF (one per program)

A 4-page A4 document sent to prospective students, built from the same syllabus data as the web page:

| Page | Content |
| --- | --- |
| 1 Cover | Crest, program name, length, format, instructor, next cohort, motto |
| 2 Overview | Who it is for, outcomes, prerequisites, the 24-week timeline coloured by module, assessment weights |
| 3 Weekly plan, weeks 1–12 | Per module: weeks, topics, hands-on task, module project, tools |
| 4 Weekly plan, weeks 13–24 | Remaining modules, capstone, practical stage (onboarding, project work, finish & polish, career week), "Good to know", admissions contact |

**Who sees it:** only the program's **confirmed** (paid) students, its instructor and admins — never visitors or students whose enrollment is still pending. Students download it from their course page (4.4) through a short-lived link.

**v1 — uploaded PDF:** the instructor or an admin uploads the designed PDF in *Content* (section *Syllabus (PDF)*, one per program; PDF only, max 25 MB). It is virus-scanned like every upload and reaches students only once clean. Uploading a new version replaces the current one after its scan passes; the instructor can download or delete any version.

**Later — generated:** admin clicks *Generate syllabus PDF* in Courses; the server renders the print template with a headless browser to PDF and stores it as the program's syllabus. Regenerated whenever the syllabus data changes; the file name and a version date are printed in the footer.

### 6.3 Syllabus template

The blank template (canvas page "syllabus-template") is the design for every future program. Fields in brackets — `[Program name]`, `[Module title]`, `[Topic]`, `[Practice task]`, `[instructor]`, `[phone] · [email]` — map one-to-one to database fields, so a new program's syllabus is created by filling a form in Admin › Courses, not by designing new pages. Timeline settings: total weeks, module end weeks, module names. Fixed text that stays the same for every program: the practical-stage block, "Good to know" and the footer motto.

## 7. Data model

One PostgreSQL database holds everything; every table has `id` (UUID), `created_at`, `updated_at`, and soft-delete `deleted_at` where history matters. Text shown to the public is stored per language (`title_ar`, `title_he`, `title_en`, or a JSON `{ar, he, en}` field).

| Entity | Key fields | Relations / notes |
| --- | --- | --- |
| **User** | email (unique), phone (E.164), first/last name, password hash (Argon2id), locale, time zone, 2FA secret (encrypted), status, last\_login\_at | Has many Roles |
| **Role / UserRole** | role: student, instructor, mentor, sales, admin | A user may have several roles |
| **Program** | slug, title, description, level, length\_weeks, format, is\_top, published, price (internal only) | Has Modules, Cohorts, Syllabus |
| **Module / Week / Lesson** | order, title, topics, hands-on task, tools; lesson: video\_id, duration, attachments, unlock\_week | Program → Module → Week → Lesson |
| **Syllabus** | program\_id, outcomes, prerequisites, assessment weights, timeline settings, pdf\_file\_id, version | One per program |
| **Cohort** | program\_id, name, start\_date, schedule (days/times), seats\_total, seats\_taken, status (open/full/running/finished), zoom\_series\_id | Has Enrollments |
| **Enrollment** | user\_id, cohort\_id, status (active, practical stage, completed, dropped), progress %, company\_placement\_id | Student ↔ Cohort |
| **CompanyPlacement** | company name, contact, project, supervisor, start/end, feedback | For the practical stage |
| **LessonProgress** | user\_id, lesson\_id, position\_seconds, completed\_at | Unique (user, lesson) |
| **VideoAsset** | provider (Bunny/Mux), provider\_video\_id, status (uploading, processing, ready, failed), duration, captions | Linked to Lesson |
| **FileAsset** | storage key, original name, mime type, size, sha256, scan status (pending/clean/infected), owner, visibility | Downloads, attachments, receipts, PDFs |
| **Lead** | first/last name, phone (unique when not merged), email, occupation, program\_id, source, stage, lost\_reason, owner\_id, availability (days + hours JSON), consent (text, time, IP) | Has Activities, Tasks; becomes a User on conversion |
| **Activity** | lead\_id, type (call, whatsapp, email, meeting, stage\_change, system), outcome, notes, author\_id, occurred\_at | Timeline |
| **Task** | lead\_id, assignee\_id, title, due\_at, status (open/done/snoozed), snoozed\_until | Follow-ups |
| **MentorProfile** | user\_id, kind (instructor/career), specialty, languages, bio, photo, session\_minutes | Has AvailabilitySlots |
| **AvailabilitySlot** | mentor\_id, start\_at, end\_at, recurring rule | Free time shown in booking |
| **Package / PackageCredit** | name (Single, 4, 8, 12), sessions, price; credits: user\_id, total, used | 8-session plan = 8 credits |
| **Booking** | user\_id, mentor\_id, service, start\_at, end\_at, status (held, confirmed, cancelled, completed, no\_show), hold\_expires\_at, zoom\_link, credit\_id, order\_id | Mentoring and career sessions |
| **Order / Payment** | user\_id, items, amount (agorot, integer), currency ILS, status (pending, paid, failed, refunded), provider, provider\_txn\_id, installments, receipt\_file\_id | Created before redirect, updated only by webhook |
| **Conversation / Message** | participants, subject; message: sender\_id, body, attachments, read\_at | Student ↔ staff only |
| **SuccessStory** | person name, program, quote (3 languages), photo, consent\_file\_id, published | Shown on Landing |
| **ChatTranscript** | session id, messages, lead\_id (optional), expires\_at | Deleted after 90 days |
| **AuditLog** | actor\_id, action, entity, entity\_id, before/after (no secrets), IP, user agent, at | Append-only |
| **Consent** | subject (user/lead), type (contact, marketing, story), text version, granted\_at, withdrawn\_at, IP | Proof of consent |

Money is stored as integers in agorot (₪250 = 25000). Times are stored in UTC and shown in the user's time zone. Large event tables (LessonProgress, AuditLog, Activity) are partitioned by month once they pass \~10 million rows.

## 8. Integrations

Every outside service is called from the server only, through one small adapter module per service, so a provider can be swapped without touching the pages.

| Need | Recommended service | How it is used | Security notes |
| --- | --- | --- | --- |
| Payments (mentoring, later installments) | Israeli gateway: Cardcom, Tranzila or Grow (\~1.5% fees); PayPal as an extra option (4.01% + ₪1.42) | Server creates the order → redirect to the hosted payment page → provider calls our webhook → order marked paid | Hosted page only (no card fields on our site); verify webhook signature, amount and order id; idempotent processing |
| Tax receipts / invoices | The gateway's invoicing module or an Israeli invoicing service (e.g. iCount, Green Invoice) | Issued automatically on "paid"; PDF stored and linked in Payments | API key in secrets manager |
| Video hosting and streaming | Bunny Stream (cheapest), Cloudflare Stream or Mux | Admin uploads straight to the provider (resumable upload); provider transcodes to HLS; we store the video id | Signed, expiring playback tokens; domain lock; optional watermark with the student's email |
| File storage | Cloudflare R2 or AWS S3 + CDN | Presigned upload/download URLs for attachments, PDFs, photos | Private bucket; links expire in minutes; virus scan before "clean" |
| Live classes and sessions | Zoom API | Creates meetings per cohort/booking; *Join* uses the stored link; recordings imported to video hosting | Zoom waiting room + passcode; links only shown to enrolled users |
| WhatsApp | WhatsApp Business Platform (Cloud API) via Meta or a provider | Booking confirmations, reminders, CRM template messages | Only approved templates; opt-in recorded; opt-out honoured |
| Email | Postmark, Resend or AWS SES | Invitations, password reset, receipts, reminders | SPF, DKIM, DMARC set on the domain |
| SMS (fallback) | Israeli SMS provider or Twilio | One-time codes, call confirmations | Rate-limited |
| Lead ads | Meta (Facebook/Instagram) lead forms webhook | New leads land in the CRM with source set | Verify Meta signature |
| AI chat assistant (v2) | Claude API or similar, with pgvector search over the knowledge base | Server-side retrieval + answer | Key server-side; no personal data sent beyond the question; output filtered |
| Calendar | .ics file download; optional Google Calendar sync for mentors | *Add to calendar* | — |
| Bot protection | Cloudflare Turnstile or hCaptcha | Enroll form, sign-up, chat hand-off | Verified on the server |
| Analytics | Plausible or GA4 with consent mode | Page views, funnel (catalog → enroll) | Cookie banner; no personal data in events |
| Error and uptime monitoring | Sentry + an uptime checker | Alerts to the team | Scrub personal data from error reports |

## 9. Security and privacy

The platform holds personal data of leads and students, paid content and payment records, so security is built in from the first commit, not added at the end. The rules below are requirements; each one should become a checklist item in code review and a test where possible. Target standard: **OWASP ASVS level 2** and the **OWASP Top 10**.

### 9.1 Accounts and sign-in

- Passwords: minimum 10 characters, checked against known-breached passwords (Have I Been Pwned k-anonymity API); hashed with **Argon2id**. Never logged, never emailed.
- **Two-step verification (TOTP app or passkey) is mandatory for every staff role** (instructor, sales, admin); optional for students.
- Login protection: 5 failed attempts → 15-minute lock per account + growing delay per IP; captcha after 3 failures. Generic error "Email or password is incorrect".
- Sessions: secure, `HttpOnly`, `SameSite=Lax` cookies; idle timeout 30 min for staff, 7 days for students; absolute limit 30 days; rotate the session id on sign-in and on role change; *Sign out of all devices*.
- Password reset and invitation links: single use, 30-minute (reset) / 72-hour (invite) expiry, stored hashed.
- Use a proven auth library or service (Auth.js / Supabase Auth / Clerk) rather than writing auth from scratch.

### 9.2 Authorization (who can see what)

- **Role-based access control checked on the server for every request**; hiding a button is never protection.
- **Ownership checks** on every record: a student can read only their own enrollments, progress, bookings, payments and messages; an instructor only their own cohorts and students; sales only CRM data. This prevents IDOR (guessing another id in the URL).
- Use UUIDs, not counting ids, in URLs.
- Admin-only: refunds, role changes, data export, deleting records, Excel import. Each is logged.
- Principle of least privilege also for staff tools: the database user of the app cannot drop tables; production access for developers is read-only and logged.

### 9.3 Web application protections (OWASP Top 10)

| Risk | Required control |
| --- | --- |
| Injection (SQL, command) | ORM / parameterised queries only; no string-built SQL; validate every input with a schema (Zod) on the server |
| Cross-site scripting (XSS) | Framework escaping by default; no `dangerouslySetInnerHTML` except sanitised (DOMPurify) rich text from admins; strict **Content-Security-Policy** with nonces |
| CSRF | SameSite cookies + CSRF token on state-changing forms; check `Origin` header |
| Broken access control | 9.2; automated tests that a student cannot open another student's data |
| Security misconfiguration | Security headers on every response (below); no stack traces to users; debug off in production |
| Vulnerable components | Dependabot / Renovate, `npm audit` in CI, lockfile committed, review new packages |
| SSRF | Server fetches only allow-listed hosts (payment, video, Zoom, WhatsApp APIs) |
| Logging failures | 9.8 |
| Open redirects | Redirect only to internal paths or an allow-list (after sign-in, after payment) |
| Mass assignment | Explicit allow-lists of editable fields (a student can never set `role` or `price`) |

**Security headers:** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Content-Security-Policy` (default-src 'self'; frame only the video player and payment page domains), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off), `frame-ancestors 'none'`.

**HTTPS everywhere** (TLS 1.2+, HTTP redirects to HTTPS), behind a CDN/WAF such as Cloudflare with DDoS protection and bot rules.

### 9.4 Forms, spam and abuse

- Enroll form, contact, sign-up, chat hand-off: **rate limit** (e.g. 5 submissions per IP per hour), **Turnstile/hCaptcha**, hidden honeypot field, server-side validation.
- API rate limits per user and per IP (e.g. 100 requests/min); stricter on login, reset and OTP endpoints.
- Excel import: max 5,000 rows and 5 MB; formulas are stripped to prevent CSV/formula injection; the same rule when exporting CSV (prefix cells starting with `= + - @`).

### 9.5 Payments

- **No card data ever touches our servers or pages** — hosted payment page or the gateway's iframe/redirect. This keeps the platform at the lightest PCI DSS level (SAQ A).
- Price and amount are calculated on the server from the database; the browser sends only the item id.
- The order becomes "paid" **only from the provider's webhook**, after verifying its signature, amount, currency and order id; webhook processing is idempotent (the same event twice does nothing).
- Refunds: admin only, with reason, logged.

### 9.6 Video and file protection

- Lesson videos play only through **signed, expiring URLs/tokens** (e.g. 2 hours), issued only to students enrolled in that cohort; domain-locked to our site. Optional visible watermark with the student's email to discourage screen recording.
- Files are in **private storage**; downloads use presigned links that expire in minutes after an access check.
- Uploads (message attachments, admin uploads): allow-list of types (PDF, PNG, JPG, CSV, IPYNB, ZIP for code), size limits, check the real file type (magic bytes, not the extension), rename to random keys, **scan for malware** (ClamAV or the storage provider's scanner) before the file can be downloaded, never execute or serve uploads from the app domain.
- Large video uploads go straight from the admin's browser to the video provider with resumable uploads; our server never proxies the bytes.

### 9.7 Data protection

- **Encryption in transit** (TLS) and **at rest** (managed database and storage encryption). Extra field-level encryption for 2FA secrets and any sensitive notes.
- **Secrets** (API keys, DB passwords, webhook secrets) in the hosting provider's secrets manager, never in the code or the repository; rotated at least yearly and immediately when a team member leaves. Secret scanning on the repository (GitHub secret scanning / gitleaks).
- Separate **production, staging and development** environments; staging uses fake data, never a copy of real personal data.
- **Data minimisation:** collect only what the form needs (no ID number, no date of birth unless required).
- **Retention:** leads not converted are deleted or anonymised after 24 months of no contact; chat transcripts after 90 days; audit logs kept 2 years; payment records 7 years (tax).

### 9.8 Logging, monitoring and audit

- **Audit log** (append-only) of: sign-ins and failures, role changes, data exports, refunds, deletions, stage changes, admin edits.
- Application logs never contain passwords, tokens, full phone numbers or card data.
- Alerts on: many failed logins, spikes in 4xx/5xx, webhook signature failures, new admin role granted.
- Error monitoring (Sentry) with personal data scrubbing; uptime monitoring with SMS/WhatsApp alerts.

### 9.9 Backups and recovery

- Automated daily database backups + point-in-time recovery (7–30 days), stored in a separate account/region, encrypted.
- **Restore test every quarter** (a backup that was never restored is not a backup).
- Targets: recovery point objective 24 h or better, recovery time objective 4 h.

### 9.10 Privacy law and consent

- **Israel:** the Protection of Privacy Law 5741-1981 with **Amendment 13** (in force since August 2025) and the **Privacy Protection (Data Security) Regulations 2017** apply. Practical duties: a clear privacy notice at every point where data is collected, a defined purpose for each data field, access and correction rights, security measures matching the database's risk level, and reporting serious security incidents to the Privacy Protection Authority. Confirm with an Israeli privacy lawyer whether a database registration or a privacy officer appointment applies.
- **GDPR** applies only if the academy targets people in the EU; the same design (consent, export, deletion) covers it.
- **Consent:** separate, unticked checkboxes for (1) being contacted about the program and (2) marketing news; WhatsApp marketing only with opt-in. The exact text, time and IP of each consent are stored.
- **User rights in the product:** *Download my data*, *Request account deletion*, unsubscribe link in every marketing message.
- **Cookie banner** for analytics/marketing cookies; essential cookies only until accepted.
- **Success stories, photos and testimonials** are published only with written consent stored in the system.
- **Minors:** if anyone under 18 can enroll, require a parent's consent.

### 9.11 Secure development process

1. Code in a private Git repository, protected main branch, every change through a pull request with review.
2. CI runs tests, lint, type check, dependency audit and secret scan on every pull request.
3. Infrastructure and environment settings as code where possible.
4. **Penetration test** by an external tester before public launch and once a year; fix critical/high findings before go-live.
5. A short `SECURITY.md` with a contact address for reporting vulnerabilities.

### 9.12 Incident response

1. **Detect** (alert or report) → 2. **Contain** (revoke keys, disable accounts, block IPs) → 3. **Assess** what data was affected → 4. **Notify** the Privacy Protection Authority and affected people when the law requires it → 5. **Fix and review**, write a short post-incident report. Keep a one-page runbook with names and phone numbers of who decides what.

## 10. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Public pages: Largest Contentful Paint < 2.5 s on 4G, Interaction to Next Paint < 200 ms, Cumulative Layout Shift < 0.1. Server responses p95 < 300 ms. Images in WebP/AVIF with sizes; fonts self-hosted and subset |
| Video | Playback starts < 3 s; adaptive bitrate 360p–1080p; works on iOS Safari and Android Chrome |
| Scale | Version 1 sized for \~2,000 users and \~500 hours of video; design allows 50,000+ users: stateless app servers, CDN for all static and video, background jobs in a queue (Redis + BullMQ), read replica and table partitioning when needed |
| Availability | 99.5% monthly for v1; maintenance windows announced; status page optional |
| Accessibility | **WCAG 2.2 AA** and Israeli Standard IS 5568 (required by Israeli accessibility regulations for websites). Keyboard access to every control, visible focus, alt text, captions on lessons, contrast ≥ 4.5:1, forms with labels and error messages linked to fields, an **Accessibility statement** page with a contact person |
| Languages and RTL | Arabic, Hebrew, English; `dir="rtl"` for ar/he; logical CSS properties (start/end, not left/right); icons with direction (arrows) flip; numbers, phone numbers and code stay LTR inside RTL text; dates and currency formatted per locale (₪) |
| SEO | Server-rendered public pages; one URL per language (`/ar/...`, `/he/...`, `/en/...`) with `hreflang`; titles and descriptions per page; `Course` and `FAQPage` structured data; sitemap.xml; robots.txt blocks `/app`, `/admin`, `/crm` |
| Browsers | Last 2 versions of Chrome, Safari, Edge, Firefox; iOS 16+, Android 10+ |
| Responsive | Breakpoints 360, 768, 1024, 1280 px; mobile layouts as in the mobile boards |
| Analytics | Funnel: landing → catalog → course details → enroll submitted → registered (joined with CRM stages). Lesson completion, mentoring booking conversion. Consent-based |
| Notifications | Email + WhatsApp; reminders 24 h and 1 h before sessions; quiet hours 21:00–08:00 for marketing |
| Content editing | All public text, FAQ, stories, programs editable in Admin in three languages without a deploy |

## 11. Tech stack, architecture and build order

Build one TypeScript codebase as a modular monolith: a Next.js web app for all pages and a NestJS API with clear modules (auth, catalog, learning, booking, payments, CRM, messaging). It is simple to run with a small team and can be split later if one part grows.

&#91;embedded content: platform architecture · 4 layers, 3 data stores, 5 outside services\]

The browser talks to the outside world directly only for two things: the payment provider's hosted page and the signed video stream. Everything else goes through the API, which checks the role and writes the audit log.

| Layer | Choice | Why |
| --- | --- | --- |
| Web front end | Next.js + TypeScript + Tailwind, next-intl for ar/he/en and RTL | Server rendering for SEO, one language for front and back |
| API | NestJS (modular monolith), Zod validation, OpenAPI docs | Clear modules, guards for roles |
| Database | PostgreSQL + Prisma (or Drizzle); pgvector for the AI assistant | Relational data, strong consistency |
| Background jobs | Redis + BullMQ | Emails, WhatsApp, PDF generation, webhooks, reminders |
| Search | PostgreSQL full-text first → Meilisearch/Typesense when needed | Courses, leads |
| Auth | Auth.js, Supabase Auth or Clerk, with roles and TOTP/passkeys | Proven, less risk |
| Video | Bunny Stream (or Cloudflare Stream / Mux) | Large uploads, HLS, signed playback |
| Files | Cloudflare R2 / S3 + CDN, presigned URLs | Cheap, scalable |
| Hosting (start) | Vercel (web) + Railway/Render (API, workers) + Supabase/Neon (Postgres) + Upstash (Redis), behind Cloudflare | Low cost, managed |
| Hosting (scale) | AWS or GCP (containers, managed Postgres with replicas) | When traffic or compliance needs it |
| Monitoring | Sentry, uptime checks, structured logs | Find problems fast |

**Build order (milestones)** — each ends with a working, tested release on staging:

1. **Foundations** — repository, CI, environments, design-system components, header/footer, language switch + RTL, auth with roles and 2FA for staff, audit log, security headers.
2. **Public site** — Landing, Catalog, Course details, Syllabus page, Mentoring page, FAQ, legal pages, admin editing for this content.
3. **Enroll + CRM core** — Enroll form → lead, owners and assignment, Leads list, Lead profile with call log, Follow-ups, Add lead, Pipeline. *This is the first public launch: the site can start collecting leads.*
4. **Student area** — Convert to student, invitations, Dashboard, My courses, Lesson player with video and downloads, progress, Messages.
5. **Mentoring bookings + payments** — mentor availability, booking flow, payment gateway + webhooks, receipts, packages/credits, Sessions page, reminders.
6. **Admin and reports** — Courses/cohorts/lessons management, Bookings, Payments, Success stories, Sales dashboard, exports, syllabus PDF generation.
7. **Chat assistant** — v1 scripted on all public pages, then v2 AI with the knowledge base and CRM hand-off.
8. **Hardening and launch** — accessibility audit, performance pass, backup restore test, external penetration test, privacy review, go-live checklist.

## 12. Open items to confirm

These are decisions or content the design leaves open; each blocks a specific part of the build.

- [ ] Contact details for header/footer, PDF and chat: phone, email, website domain, social links (now placeholders)
- [ ] Terms of use, privacy policy, cancellation & refund policy, accessibility statement — texts to be written (with a lawyer for privacy)
- [ ] Final cancellation rule for mentoring sessions (design assumes free reschedule/cancel up to 24 h before)
- [ ] Instructors for Full Stack Diploma and DevOps, and lengths of Python with AI, Data Analysis with AI and DevOps
- [ ] Real cohort dates (design shows 2, 9 and 16 November as examples)
- [ ] Payment gateway choice (Cardcom / Tranzila / Grow) and whether PayPal is offered
- [ ] Whether program installments will ever be paid online, or always arranged by the advisor
- [ ] Landing copy that still mentions online payment ("Enroll and pay online" step text and the FAQ "How do I pay?") — align with "no payment when you enroll"
- [ ] Graduate stories: replace illustrative stories with real ones (with consent); remove the "Software testing graduate" example since QA courses were removed
- [ ] Career advisors list (Noa Levi, Karim Odeh, Rana Issa appear in the mentoring designs) — confirm real names or replace
- [ ] Lead assignment rule: round-robin, by program, or manual
- [ ] Whether students under 18 can enroll (parent consent flow)
- [ ] Public log-in link: when to show it again
- [ ] Syllabi for the other four programs, using the template
- [ ] Chat assistant on all pages (currently placed on the Landing in the design)
