import type { LocalizedText, ProgramLevel, ProgramSubject } from '@eta/shared';

/**
 * Starting content for the public site, in en/ar/he. Admin editing replaces this later (spec §3.1).
 * ⚠ To confirm with the academy:
 *  - instructor bios and the Arabic/Hebrew spelling of names (kept in Latin letters for now);
 *  - cohort dates (spec §12: 2, 9 and 16 November are design examples);
 *  - Arabic and Hebrew texts need a native-speaker review.
 */

const same = (text: string): LocalizedText => ({ en: text, ar: text, he: text });

export interface SeedInstructor {
  slug: string;
  name: LocalizedText;
  role: LocalizedText;
  bio: LocalizedText;
  photoPath: string;
  featured: boolean;
  sortOrder: number;
}

const INSTRUCTOR_ROLE: LocalizedText = {
  en: 'Program instructor and mentor',
  ar: 'مدرّسة ومرشدة في البرنامج',
  he: 'מרצה ומנטורית בתוכנית',
};

export const INSTRUCTORS: SeedInstructor[] = [
  {
    slug: 'rana-arafat',
    name: same('Rana Arafat'),
    role: INSTRUCTOR_ROLE,
    bio: {
      en: 'Rana leads the Data Analysis with AI program. She teaches SQL, Python and data visualisation with real datasets, and guides each cohort through the practical stage at a partner company.',
      ar: 'تقود رنا برنامج تحليل البيانات مع الذكاء الاصطناعي. تدرّس SQL وبايثون وتصوير البيانات باستخدام بيانات حقيقية، وترافق كل دفعة خلال المرحلة العملية في شركة شريكة.',
      he: 'ראנה מובילה את תוכנית ניתוח נתונים עם AI. היא מלמדת SQL,‏ Python והצגת נתונים על מאגרי נתונים אמיתיים, ומלווה כל מחזור בשלב המעשי בחברה שותפה.',
    },
    photoPath: '/images/instructors/rana-arafat.jpg',
    featured: false,
    sortOrder: 1,
  },
  {
    slug: 'dania-hih',
    name: same('Dania Hih'),
    role: INSTRUCTOR_ROLE,
    bio: {
      en: 'Dania leads the Full Stack Advanced with AI program. She teaches modern web development with TypeScript, React, Next.js and Node.js, with a focus on clean code and real projects, and guides each cohort from the first lesson to the practical stage at a partner company.',
      ar: 'تقود دانية برنامج Full Stack المتقدّم مع الذكاء الاصطناعي. تدرّس تطوير الويب الحديث باستخدام TypeScript وReact وNext.js وNode.js، مع التركيز على الكود النظيف والمشاريع الحقيقية، وترافق كل دفعة من الدرس الأول حتى المرحلة العملية في شركة شريكة.',
      he: 'דניה מובילה את תוכנית Full Stack מתקדם עם AI. היא מלמדת פיתוח ווב מודרני עם TypeScript,‏ React,‏ Next.js ו-Node.js, עם דגש על קוד נקי ופרויקטים אמיתיים, ומלווה כל מחזור מהשיעור הראשון ועד השלב המעשי בחברה שותפה.',
    },
    photoPath: '/images/instructors/dania-hih.jpg',
    featured: true,
    sortOrder: 2,
  },
  {
    slug: 'muhammad-wattad',
    name: same('Dr. Muhammad Wattad'),
    role: {
      en: 'Program instructor and mentor',
      ar: 'مدرّس ومرشد في البرنامج',
      he: 'מרצה ומנטור בתוכנית',
    },
    bio: {
      en: 'Dr. Muhammad leads the Python with AI program. He teaches Python, machine learning and applied AI, combining academic depth with hands-on projects, and accompanies each cohort into the practical stage.',
      ar: 'يقود د. محمد برنامج بايثون مع الذكاء الاصطناعي. يدرّس بايثون وتعلّم الآلة والذكاء الاصطناعي التطبيقي، ويجمع بين العمق الأكاديمي والمشاريع العملية، ويرافق كل دفعة حتى المرحلة العملية.',
      he: 'ד"ר מוחמד מוביל את תוכנית Python עם AI. הוא מלמד Python, למידת מכונה ובינה מלאכותית יישומית, משלב עומק אקדמי עם פרויקטים מעשיים ומלווה כל מחזור עד השלב המעשי.',
    },
    photoPath: '/images/instructors/muhammad-wattad.jpg',
    featured: false,
    sortOrder: 3,
  },
];

export interface SeedProgram {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  level: ProgramLevel;
  subject: ProgramSubject;
  lengthWeeks: number | null;
  tags: string[];
  topOrder: number | null;
  instructorSlug: string | null;
}

export const PROGRAMS: SeedProgram[] = [
  {
    slug: 'data-analysis-ai',
    title: {
      en: 'Data Analysis with AI',
      ar: 'تحليل البيانات مع الذكاء الاصطناعي',
      he: 'ניתוח נתונים עם AI',
    },
    summary: {
      en: 'Turn data into decisions with SQL, Python, dashboards and AI tools.',
      ar: 'حوّل البيانات إلى قرارات باستخدام SQL وبايثون ولوحات المعلومات وأدوات الذكاء الاصطناعي.',
      he: 'הופכים נתונים להחלטות עם SQL,‏ Python, דשבורדים וכלי AI.',
    },
    level: 'beginner',
    subject: 'data',
    lengthWeeks: null,
    tags: ['SQL', 'Python', 'AI'],
    topOrder: 1,
    instructorSlug: 'rana-arafat',
  },
  {
    slug: 'full-stack-advanced-ai',
    title: {
      en: 'Full Stack Advanced with AI',
      ar: 'Full Stack متقدّم مع الذكاء الاصطناعي',
      he: 'Full Stack מתקדם עם AI',
    },
    summary: {
      en: 'Build production web apps with React, Next.js, Node.js and AI features in 24 weeks.',
      ar: 'ابنِ تطبيقات ويب احترافية باستخدام React وNext.js وNode.js وميزات الذكاء الاصطناعي خلال 24 أسبوعًا.',
      he: 'בונים אפליקציות ווב אמיתיות עם React,‏ Next.js,‏ Node.js ויכולות AI ב-24 שבועות.',
    },
    level: 'advanced',
    subject: 'web',
    lengthWeeks: 24,
    tags: ['React', 'Node', 'AI'],
    topOrder: 2,
    instructorSlug: 'dania-hih',
  },
  {
    slug: 'python-ai',
    title: { en: 'Python with AI', ar: 'بايثون مع الذكاء الاصطناعي', he: 'Python עם AI' },
    summary: {
      en: 'From Python foundations to machine learning and applied AI projects.',
      ar: 'من أساسيات بايثون إلى تعلّم الآلة ومشاريع الذكاء الاصطناعي التطبيقية.',
      he: 'מיסודות Python ועד למידת מכונה ופרויקטים של AI יישומי.',
    },
    level: 'intermediate',
    subject: 'ai',
    lengthWeeks: null,
    tags: ['Python', 'ML', 'AI'],
    topOrder: 3,
    instructorSlug: 'muhammad-wattad',
  },
  {
    slug: 'full-stack-diploma',
    title: { en: 'Full Stack Diploma', ar: 'دبلوم Full Stack', he: 'דיפלומה ב-Full Stack' },
    summary: {
      en: 'A one-year path from your first line of code to a job-ready full stack developer.',
      ar: 'مسار لمدة سنة من أول سطر كود حتى تصبح مطوّر Full Stack جاهزًا لسوق العمل.',
      he: 'מסלול של שנה מהשורה הראשונה של קוד ועד מפתח/ת Full Stack מוכנ/ה לעבודה.',
    },
    level: 'beginner',
    subject: 'web',
    lengthWeeks: 52,
    tags: ['HTML', 'JavaScript', 'SQL'],
    topOrder: null,
    instructorSlug: null,
  },
  {
    slug: 'devops',
    title: same('DevOps'),
    summary: {
      en: 'Ship and run software reliably: Linux, Docker, CI/CD and the cloud.',
      ar: 'انشر البرمجيات وشغّلها بموثوقية: Linux وDocker وCI/CD والسحابة.',
      he: 'משחררים ומפעילים תוכנה באמינות: Linux,‏ Docker,‏ CI/CD וענן.',
    },
    level: 'intermediate',
    subject: 'devops',
    lengthWeeks: null,
    tags: ['Linux', 'Docker', 'Cloud'],
    topOrder: null,
    instructorSlug: null,
  },
];

export interface SeedFaq {
  key: string;
  question: LocalizedText;
  answer: LocalizedText;
}

export const FAQS: SeedFaq[] = [
  {
    key: 'landing.prior-experience',
    question: {
      en: 'Do I need prior experience?',
      ar: 'هل أحتاج إلى خبرة سابقة؟',
      he: 'האם צריך ניסיון קודם?',
    },
    answer: {
      en: 'Not for beginner programs such as Data Analysis with AI. Each program page lists what you need before you join, and an advisor helps you choose the right level on the call.',
      ar: 'ليس في البرامج المخصّصة للمبتدئين مثل تحليل البيانات مع الذكاء الاصطناعي. توضّح صفحة كل برنامج ما تحتاجه قبل الانضمام، ويساعدك المستشار في اختيار المستوى المناسب خلال المكالمة.',
      he: 'לא בתוכניות למתחילים כמו ניתוח נתונים עם AI. בעמוד של כל תוכנית מפורט מה צריך לפני ההצטרפות, והיועץ עוזר לבחור את הרמה המתאימה בשיחה.',
    },
  },
  {
    key: 'landing.how-lessons-work',
    question: {
      en: 'How do the lessons work?',
      ar: 'كيف تتم الدروس؟',
      he: 'איך מתנהלים השיעורים?',
    },
    answer: {
      en: 'Classes are live on Zoom with your instructor and group. Every class is recorded and available in the student area, together with materials to download.',
      ar: 'الحصص مباشرة عبر Zoom مع المدرّس والمجموعة. تُسجَّل كل حصة وتكون متاحة في منطقة الطالب، مع مواد للتنزيل.',
      he: 'השיעורים מתקיימים בזום בשידור חי עם המרצה והקבוצה. כל שיעור מוקלט וזמין באזור הסטודנטים, יחד עם חומרים להורדה.',
    },
  },
  {
    key: 'landing.mentoring-vs-career',
    question: {
      en: 'What’s the difference between mentoring and career advice?',
      ar: 'ما الفرق بين الإرشاد والاستشارة المهنية؟',
      he: 'מה ההבדל בין ליווי אישי לייעוץ קריירה?',
    },
    answer: {
      en: 'Mentoring is one-to-one meetings with a program instructor for help with lessons and projects: ₪250 per session, or the 8-session plan for ₪2,000. Career advice is a single session with a tech professional: CV review, mock interview or choosing a direction.',
      ar: 'الإرشاد هو لقاءات فردية مع مدرّس البرنامج للمساعدة في الدروس والمشاريع: ‎₪250 للجلسة، أو باقة 8 جلسات بـ ‎₪2,000. الاستشارة المهنية جلسة واحدة مع مختص في التكنولوجيا: مراجعة السيرة الذاتية، أو مقابلة تجريبية، أو اختيار الاتجاه.',
      he: 'ליווי אישי הוא פגישות אחד-על-אחד עם מרצה התוכנית לעזרה בשיעורים ובפרויקטים: ‎₪250 לפגישה, או חבילת 8 פגישות ב-‎₪2,000. ייעוץ קריירה הוא פגישה אחת עם איש/אשת מקצוע מההייטק: בדיקת קורות חיים, ראיון דמה או בחירת כיוון.',
    },
  },
  {
    key: 'landing.payment',
    question: { en: 'How do I pay?', ar: 'كيف أدفع؟', he: 'איך משלמים?' },
    answer: {
      en: 'You don’t pay when you enroll. An advisor calls you to explain the price and installment options, and you register after choosing a cohort. Mentoring and career advice sessions are paid securely online when you book them.',
      ar: 'لا تدفع عند التسجيل. يتصل بك مستشار ليشرح السعر وخيارات التقسيط، وتسجّل بعد اختيار الدفعة. تُدفع جلسات الإرشاد والاستشارة المهنية بأمان عبر الإنترنت عند حجزها.',
      he: 'לא משלמים בהרשמה. יועץ מתקשר כדי להסביר את המחיר ואפשרויות התשלומים, וההרשמה נעשית אחרי בחירת מחזור. פגישות ליווי וייעוץ קריירה משולמות באופן מאובטח באתר בזמן ההזמנה.',
    },
  },
  {
    key: 'landing.reschedule',
    question: {
      en: 'Can I reschedule or cancel a session?',
      ar: 'هل يمكنني تغيير موعد جلسة أو إلغاؤها؟',
      he: 'אפשר לשנות מועד של פגישה או לבטל אותה?',
    },
    answer: {
      en: 'Yes, free of charge up to 24 hours before the session, from your dashboard. A cancelled mentoring session returns the credit to your package.',
      ar: 'نعم، مجانًا حتى 24 ساعة قبل الجلسة، من لوحة التحكم الخاصة بك. تعود الجلسة الملغاة من الإرشاد كرصيد إلى باقتك.',
      he: 'כן, ללא עלות עד 24 שעות לפני הפגישה, מלוח הבקרה שלך. פגישת ליווי שבוטלה חוזרת כקרדיט לחבילה.',
    },
  },
];

export interface SeedStory {
  key: string;
  personName: string;
  programLabel: LocalizedText;
  quote: LocalizedText;
}

/** Illustrative only (isExample = true): never shown in production. */
export const EXAMPLE_STORIES: SeedStory[] = [
  {
    key: 'example.maya-rizk',
    personName: 'Maya Rizk',
    programLabel: {
      en: 'Web development graduate',
      ar: 'خرّيجة تطوير الويب',
      he: 'בוגרת פיתוח ווב',
    },
    quote: {
      en: 'Weekly mentoring helped me finish my first project and add it to my portfolio.',
      ar: 'ساعدني الإرشاد الأسبوعي على إنهاء مشروعي الأول وإضافته إلى ملف أعمالي.',
      he: 'הליווי השבועי עזר לי לסיים את הפרויקט הראשון שלי ולהוסיף אותו לתיק העבודות.',
    },
  },
  {
    key: 'example.yousef-issa',
    personName: 'Yousef Issa',
    programLabel: {
      en: 'Data analysis graduate',
      ar: 'خرّيج تحليل البيانات',
      he: 'בוגר ניתוח נתונים',
    },
    quote: {
      en: 'Recorded lessons let me learn after work, and the advice session made my next step clear.',
      ar: 'أتاحت لي الدروس المسجّلة التعلّم بعد العمل، وجعلت جلسة الاستشارة خطوتي التالية واضحة.',
      he: 'השיעורים המוקלטים אפשרו לי ללמוד אחרי העבודה, ופגישת הייעוץ הבהירה לי את הצעד הבא.',
    },
  },
];
