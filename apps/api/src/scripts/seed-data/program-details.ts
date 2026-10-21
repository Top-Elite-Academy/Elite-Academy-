import type { Locale, LocalizedList, LocalizedText } from '@eta/shared';

/**
 * Course details content (spec §3.3), keyed by program slug.
 * ⚠ DRAFT TEXT to confirm and replace with the academy's real content:
 *  - only Full Stack Advanced with AI has a curriculum (spec §12: the other syllabi are still to write);
 *  - teaching languages, cohort days/times and seats are examples;
 *  - Arabic and Hebrew need a native-speaker review.
 */

export interface SeedModule {
  title: LocalizedText;
  weekFrom: number;
  weekTo: number;
  topics: LocalizedList;
}

export interface SeedCohort {
  name: string;
  startDate: string;
  schedule: { days: string[]; from: string; to: string };
  seatsTotal: number;
  seatsTaken: number;
}

export interface SeedProgramDetails {
  overview: LocalizedText;
  audience: LocalizedText;
  outcomes: LocalizedList;
  teachingLanguages: Locale[];
  modules: SeedModule[];
  cohorts: SeedCohort[];
}

const EVENING = { from: '18:00', to: '21:00' };

export const PROGRAM_DETAILS: Record<string, SeedProgramDetails> = {
  'full-stack-advanced-ai': {
    overview: {
      en: 'A 24-week program for building complete, production-quality web applications with TypeScript, React, Next.js and Node.js — and adding AI features to them. Two live meetings a week, hands-on tasks and code review, then a practical stage on a partner company’s product.',
      ar: 'برنامج لمدة 24 أسبوعًا لبناء تطبيقات ويب كاملة بجودة احترافية باستخدام TypeScript وReact وNext.js وNode.js، وإضافة ميزات الذكاء الاصطناعي إليها. لقاءان مباشران أسبوعيًا، ومهام عملية ومراجعة للكود، ثم مرحلة عملية على منتج شركة شريكة.',
      he: 'תוכנית של 24 שבועות לבניית אפליקציות ווב מלאות ברמה מקצועית עם TypeScript,‏ React,‏ Next.js ו-Node.js — והוספת יכולות AI אליהן. שני מפגשים חיים בשבוע, משימות מעשיות וסקירת קוד, ואז שלב מעשי על מוצר של חברה שותפה.',
    },
    audience: {
      en: 'For people who already know basic programming (variables, functions, loops) and want to become full stack developers.',
      ar: 'لمن يعرف أساسيات البرمجة (المتغيّرات، الدوال، الحلقات) ويريد أن يصبح مطوّر Full Stack.',
      he: 'למי שכבר מכיר/ה יסודות תכנות (משתנים, פונקציות, לולאות) ורוצה להפוך למפתח/ת Full Stack.',
    },
    outcomes: {
      en: [
        'Build typed front ends with React and Next.js',
        'Design REST APIs with Node.js and PostgreSQL',
        'Secure apps with sign-in, roles and validation',
        'Add AI features with LLM APIs and retrieval',
        'Test, containerise and deploy with CI/CD',
        'Ship a capstone project for your portfolio',
      ],
      ar: [
        'بناء واجهات أمامية مع React وNext.js باستخدام TypeScript',
        'تصميم واجهات REST باستخدام Node.js وPostgreSQL',
        'تأمين التطبيقات بتسجيل الدخول والأدوار والتحقق من المدخلات',
        'إضافة ميزات الذكاء الاصطناعي عبر واجهات LLM والاسترجاع',
        'الاختبار والتغليف بالحاويات والنشر عبر CI/CD',
        'إنجاز مشروع تخرّج لملف أعمالك',
      ],
      he: [
        'בניית צד לקוח מוקלד עם React ו-Next.js',
        'תכנון ממשקי REST עם Node.js ו-PostgreSQL',
        'אבטחת אפליקציות עם התחברות, הרשאות ואימות קלט',
        'הוספת יכולות AI עם ממשקי LLM ואחזור מידע',
        'בדיקות, קונטיינרים והעלאה לאוויר עם CI/CD',
        'פרויקט גמר לתיק העבודות',
      ],
    },
    teachingLanguages: ['ar', 'he'],
    modules: [
      {
        title: {
          en: 'Modern JavaScript and TypeScript',
          ar: 'JavaScript الحديثة وTypeScript',
          he: 'JavaScript מודרני ו-TypeScript',
        },
        weekFrom: 1,
        weekTo: 4,
        topics: {
          en: [
            'Modules, async/await and the event loop',
            'TypeScript types and generics',
            'Unit testing basics',
          ],
          ar: [
            'الوحدات وasync/await وحلقة الأحداث',
            'الأنواع والأنواع العامة في TypeScript',
            'أساسيات اختبار الوحدات',
          ],
          he: [
            'מודולים, async/await ולולאת האירועים',
            'טיפוסים וגנריקה ב-TypeScript',
            'יסודות בדיקות יחידה',
          ],
        },
      },
      {
        title: { en: 'React and Next.js', ar: 'React وNext.js', he: 'React ו-Next.js' },
        weekFrom: 5,
        weekTo: 9,
        topics: {
          en: [
            'Components, state and hooks',
            'Next.js App Router and server rendering',
            'Accessible forms and validation',
          ],
          ar: [
            'المكوّنات والحالة والخطافات',
            'App Router في Next.js والعرض على الخادم',
            'نماذج سهلة الوصول والتحقق منها',
          ],
          he: [
            'קומפוננטות, state ו-hooks',
            'App Router ב-Next.js ורינדור בצד השרת',
            'טפסים נגישים ואימות',
          ],
        },
      },
      {
        title: {
          en: 'Back end with Node.js',
          ar: 'الواجهة الخلفية مع Node.js',
          he: 'צד שרת עם Node.js',
        },
        weekFrom: 10,
        weekTo: 14,
        topics: {
          en: [
            'REST APIs with NestJS',
            'PostgreSQL and Prisma',
            'Authentication, roles and security basics',
          ],
          ar: [
            'واجهات REST باستخدام NestJS',
            'PostgreSQL وPrisma',
            'المصادقة والأدوار وأساسيات الأمان',
          ],
          he: ['ממשקי REST עם NestJS', 'PostgreSQL ו-Prisma', 'אימות, הרשאות ויסודות אבטחה'],
        },
      },
      {
        title: {
          en: 'AI in your applications',
          ar: 'الذكاء الاصطناعي في تطبيقاتك',
          he: 'AI באפליקציות שלך',
        },
        weekFrom: 15,
        weekTo: 18,
        topics: {
          en: [
            'Working with LLM APIs',
            'Retrieval (RAG) and prompt design',
            'Responsible and safe AI features',
          ],
          ar: [
            'العمل مع واجهات نماذج اللغة',
            'الاسترجاع (RAG) وتصميم التعليمات',
            'ميزات ذكاء اصطناعي مسؤولة وآمنة',
          ],
          he: ['עבודה עם ממשקי LLM', 'אחזור מידע (RAG) וניסוח הנחיות', 'יכולות AI אחראיות ובטוחות'],
        },
      },
      {
        title: {
          en: 'Shipping to production',
          ar: 'الإطلاق إلى بيئة الإنتاج',
          he: 'העלאה לסביבת ייצור',
        },
        weekFrom: 19,
        weekTo: 20,
        topics: {
          en: ['Docker and CI/CD pipelines', 'Deployment, logging and monitoring'],
          ar: ['Docker وخطوط CI/CD', 'النشر والسجلات والمراقبة'],
          he: ['Docker ו-CI/CD', 'העלאה לאוויר, לוגים וניטור'],
        },
      },
      {
        title: { en: 'Capstone project', ar: 'مشروع التخرّج', he: 'פרויקט גמר' },
        weekFrom: 21,
        weekTo: 24,
        topics: {
          en: ['Plan and design your product', 'Build it with weekly code review', 'Demo day'],
          ar: ['تخطيط منتجك وتصميمه', 'بناؤه مع مراجعة أسبوعية للكود', 'يوم العرض'],
          he: ['תכנון ועיצוב המוצר', 'בנייה עם סקירת קוד שבועית', 'יום הצגה'],
        },
      },
    ],
    cohorts: [
      {
        name: 'November 2026',
        startDate: '2026-11-09',
        schedule: { days: ['mon', 'wed'], ...EVENING },
        seatsTotal: 20,
        seatsTaken: 18,
      },
      {
        name: 'January 2027',
        startDate: '2027-01-10',
        schedule: { days: ['sun', 'tue'], ...EVENING },
        seatsTotal: 20,
        seatsTaken: 4,
      },
    ],
  },
  'data-analysis-ai': {
    overview: {
      en: 'Learn to clean, analyse and present data with SQL, Python and dashboards, and to use AI tools to work faster — finishing with a practical stage on real company data.',
      ar: 'تعلّم تنظيف البيانات وتحليلها وعرضها باستخدام SQL وبايثون ولوحات المعلومات، واستخدام أدوات الذكاء الاصطناعي للعمل بسرعة أكبر — مع مرحلة عملية على بيانات حقيقية لشركة.',
      he: 'לומדים לנקות, לנתח ולהציג נתונים עם SQL,‏ Python ודשבורדים, ולהשתמש בכלי AI כדי לעבוד מהר יותר — עם שלב מעשי על נתונים אמיתיים של חברה.',
    },
    audience: {
      en: 'For beginners and career changers who like numbers. No programming experience needed.',
      ar: 'للمبتدئين ومن يغيّرون مسارهم المهني ويحبّون الأرقام. لا حاجة لخبرة برمجية.',
      he: 'למתחילים ולמי שמחליפים קריירה ואוהבים מספרים. אין צורך בניסיון בתכנות.',
    },
    outcomes: {
      en: [
        'Query databases with SQL',
        'Analyse data with Python and pandas',
        'Build clear dashboards',
        'Use AI tools to speed up analysis',
        'Present findings to decision makers',
      ],
      ar: [
        'الاستعلام من قواعد البيانات باستخدام SQL',
        'تحليل البيانات باستخدام بايثون وpandas',
        'بناء لوحات معلومات واضحة',
        'استخدام أدوات الذكاء الاصطناعي لتسريع التحليل',
        'عرض النتائج لصنّاع القرار',
      ],
      he: [
        'שליפת נתונים עם SQL',
        'ניתוח נתונים עם Python ו-pandas',
        'בניית דשבורדים ברורים',
        'שימוש בכלי AI להאצת הניתוח',
        'הצגת ממצאים למקבלי החלטות',
      ],
    },
    teachingLanguages: ['ar', 'he'],
    modules: [],
    cohorts: [
      {
        name: 'November 2026',
        startDate: '2026-11-02',
        schedule: { days: ['sun', 'wed'], ...EVENING },
        seatsTotal: 20,
        seatsTaken: 12,
      },
    ],
  },
  'python-ai': {
    overview: {
      en: 'From Python foundations to machine learning and applied AI, with hands-on projects every week and a practical stage at a partner company.',
      ar: 'من أساسيات بايثون إلى تعلّم الآلة والذكاء الاصطناعي التطبيقي، مع مشاريع عملية كل أسبوع ومرحلة عملية في شركة شريكة.',
      he: 'מיסודות Python ועד למידת מכונה ו-AI יישומי, עם פרויקטים מעשיים בכל שבוע ושלב מעשי בחברה שותפה.',
    },
    audience: {
      en: 'For learners with some programming basics who want to work with data and AI.',
      ar: 'لمن لديهم أساسيات في البرمجة ويريدون العمل مع البيانات والذكاء الاصطناعي.',
      he: 'ללומדים עם יסודות בתכנות שרוצים לעבוד עם נתונים ו-AI.',
    },
    outcomes: {
      en: [
        'Write clean, tested Python',
        'Prepare and explore datasets',
        'Train and evaluate machine-learning models',
        'Build applied AI features',
        'Deliver an end-to-end AI project',
      ],
      ar: [
        'كتابة كود بايثون نظيف ومختبَر',
        'تجهيز مجموعات البيانات واستكشافها',
        'تدريب نماذج تعلّم الآلة وتقييمها',
        'بناء ميزات ذكاء اصطناعي تطبيقية',
        'إنجاز مشروع ذكاء اصطناعي متكامل',
      ],
      he: [
        'כתיבת Python נקי ובדוק',
        'הכנה וחקירה של מאגרי נתונים',
        'אימון והערכה של מודלים ללמידת מכונה',
        'בניית יכולות AI יישומיות',
        'פרויקט AI מקצה לקצה',
      ],
    },
    teachingLanguages: ['ar', 'he'],
    modules: [],
    cohorts: [
      {
        name: 'November 2026',
        startDate: '2026-11-16',
        schedule: { days: ['sun', 'tue'], ...EVENING },
        seatsTotal: 20,
        seatsTaken: 8,
      },
    ],
  },
  'full-stack-diploma': {
    overview: {
      en: 'A one-year path from your first line of code to a job-ready full stack developer, with a practical stage at a partner company.',
      ar: 'مسار لمدة سنة من أول سطر كود حتى تصبح مطوّر Full Stack جاهزًا لسوق العمل، مع مرحلة عملية في شركة شريكة.',
      he: 'מסלול של שנה מהשורה הראשונה של קוד ועד מפתח/ת Full Stack מוכנ/ה לעבודה, עם שלב מעשי בחברה שותפה.',
    },
    audience: {
      en: 'For complete beginners who want a structured, long path into software development.',
      ar: 'للمبتدئين تمامًا الذين يريدون مسارًا منظّمًا وطويلًا لدخول عالم تطوير البرمجيات.',
      he: 'למתחילים לגמרי שרוצים מסלול מובנה וארוך לעולם פיתוח התוכנה.',
    },
    outcomes: {
      en: [
        'Build web pages with HTML, CSS and JavaScript',
        'Create full stack applications',
        'Work with databases and APIs',
        'Collaborate with Git like a team',
        'Finish with a portfolio of projects',
      ],
      ar: [
        'بناء صفحات ويب باستخدام HTML وCSS وJavaScript',
        'إنشاء تطبيقات Full Stack',
        'العمل مع قواعد البيانات وواجهات API',
        'العمل الجماعي باستخدام Git',
        'إنهاء البرنامج بملف أعمال من المشاريع',
      ],
      he: [
        'בניית דפי ווב עם HTML,‏ CSS ו-JavaScript',
        'יצירת אפליקציות Full Stack',
        'עבודה עם מסדי נתונים וממשקי API',
        'עבודת צוות עם Git',
        'סיום עם תיק עבודות של פרויקטים',
      ],
    },
    teachingLanguages: ['ar', 'he'],
    modules: [],
    cohorts: [],
  },
  devops: {
    overview: {
      en: 'Learn to ship and run software reliably: Linux, Docker, CI/CD pipelines and the cloud, with a practical stage at a partner company.',
      ar: 'تعلّم نشر البرمجيات وتشغيلها بموثوقية: Linux وDocker وخطوط CI/CD والسحابة، مع مرحلة عملية في شركة شريكة.',
      he: 'לומדים לשחרר ולהפעיל תוכנה באמינות: Linux,‏ Docker,‏ CI/CD וענן, עם שלב מעשי בחברה שותפה.',
    },
    audience: {
      en: 'For developers and IT people who want to move into DevOps.',
      ar: 'للمطوّرين والعاملين في تكنولوجيا المعلومات الراغبين في الانتقال إلى DevOps.',
      he: 'למפתחים ולאנשי IT שרוצים לעבור ל-DevOps.',
    },
    outcomes: {
      en: [
        'Work confidently on Linux',
        'Package apps with Docker',
        'Automate builds and releases with CI/CD',
        'Deploy and monitor in the cloud',
      ],
      ar: [
        'العمل بثقة على Linux',
        'تغليف التطبيقات باستخدام Docker',
        'أتمتة البناء والإصدار عبر CI/CD',
        'النشر والمراقبة في السحابة',
      ],
      he: [
        'עבודה בביטחון על Linux',
        'אריזת אפליקציות עם Docker',
        'אוטומציה של בנייה ושחרור עם CI/CD',
        'העלאה וניטור בענן',
      ],
    },
    teachingLanguages: ['ar', 'he'],
    modules: [],
    cohorts: [],
  },
};

/** The same four course questions for every program (spec §3.3), keyed per program when seeded. */
export const PROGRAM_FAQS: { key: string; question: LocalizedText; answer: LocalizedText }[] = [
  {
    key: 'before-start',
    question: {
      en: 'What do I need before I start?',
      ar: 'ما الذي أحتاجه قبل البدء؟',
      he: 'מה צריך לפני שמתחילים?',
    },
    answer: {
      en: 'A computer with a stable internet connection and a few hours a week for practice. The “Who it’s for” section explains the level you need; an advisor can help you check on the call.',
      ar: 'حاسوب مع اتصال إنترنت مستقر وبضع ساعات أسبوعيًا للتدريب. يوضّح قسم «لمن هذا البرنامج» المستوى المطلوب، ويمكن للمستشار مساعدتك في التحقق خلال المكالمة.',
      he: 'מחשב עם חיבור אינטרנט יציב וכמה שעות בשבוע לתרגול. בפסקה "למי זה מתאים" מוסבר הרמה הנדרשת, ויועץ יכול לעזור לבדוק בשיחה.',
    },
  },
  {
    key: 'missed-meeting',
    question: {
      en: 'What if I miss a meeting?',
      ar: 'ماذا لو فاتني لقاء؟',
      he: 'מה אם פספסתי מפגש?',
    },
    answer: {
      en: 'Every meeting is recorded and available in the student area, together with the materials, so you can catch up and ask the instructor your questions.',
      ar: 'يُسجَّل كل لقاء ويكون متاحًا في منطقة الطالب مع المواد، لتتمكّن من اللحاق وطرح أسئلتك على المدرّس.',
      he: 'כל מפגש מוקלט וזמין באזור הסטודנטים יחד עם החומרים, כדי שתוכלו להשלים ולשאול את המרצה שאלות.',
    },
  },
  {
    key: 'certificate',
    question: { en: 'Do I get a certificate?', ar: 'هل أحصل على شهادة؟', he: 'האם מקבלים תעודה?' },
    answer: {
      en: 'Yes. You receive an Elite Tech Academy certificate after completing the program and its practical stage.',
      ar: 'نعم. تحصل على شهادة من أكاديمية إيليت تك بعد إتمام البرنامج والمرحلة العملية.',
      he: 'כן. מקבלים תעודה של אקדמיית אליט טק בסיום התוכנית והשלב המעשי.',
    },
  },
  {
    key: 'refund',
    question: {
      en: 'Can I withdraw and get a refund?',
      ar: 'هل يمكنني الانسحاب واسترداد المبلغ؟',
      he: 'אפשר לבטל ולקבל החזר?',
    },
    answer: {
      en: 'Yes, under the cancellation and refund policy. The advisor goes over the terms with you before you register.',
      ar: 'نعم، وفق سياسة الإلغاء والاسترداد. يشرح لك المستشار الشروط قبل التسجيل.',
      he: 'כן, לפי מדיניות הביטולים וההחזרים. היועץ עובר איתך על התנאים לפני ההרשמה.',
    },
  },
];
