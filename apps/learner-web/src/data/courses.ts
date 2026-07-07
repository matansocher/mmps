import coursesJson from './courses.json';

export type QuizOption = {
  readonly text: string;
  readonly correct: boolean;
};

export type Quiz = {
  readonly question: string;
  readonly options: readonly QuizOption[];
  readonly explain: string;
};

export type Lesson = {
  readonly id: string;
  readonly group: string;
  readonly nav: string;
  readonly title: string;
  readonly lede: string;
  readonly html: string;
};

export type Course = {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly color: string;
  readonly lessons: readonly Lesson[];
  readonly quizzes: readonly Quiz[];
};

export const COURSES = coursesJson as readonly Course[];

export type CourseCategory = {
  readonly name: string;
  readonly courseIds: readonly string[];
};

// Homepage categories — course ids are listed in recommended learning order.
export const COURSE_CATEGORIES: readonly CourseCategory[] = [
  {
    name: 'AI',
    courseIds: [
      'embeddings-vector-databases-course',
      'prompt-engineering-course',
      'rag-deep-dive-course',
      'context-engineering-course',
      'structured-output-course',
      'mcp-tool-use-course',
      'multi-agent-patterns-course',
      'finetuning-vs-rag-vs-prompting-course',
      'llm-inference-serving-course',
      'llm-eval-observability-course',
      'llm-security-course',
      'ai-system-design-course',
    ],
  },
  {
    name: 'Backend & Systems',
    courseIds: ['distributed-systems-course', 'event-driven-architecture-course'],
  },
  {
    name: 'Databases',
    courseIds: ['databases-course'],
  },
  {
    name: 'Networking',
    courseIds: ['networking-course'],
  },
  {
    name: 'Languages',
    courseIds: ['typescript-deep-dive-course', 'nodejs-internals-course'],
  },
];

const COURSE_ORDER: readonly string[] = COURSE_CATEGORIES.flatMap((cat) => cat.courseIds);

export const ORDERED_COURSES: readonly Course[] = [...COURSES].sort((a, b) => {
  const ia = COURSE_ORDER.indexOf(a.id);
  const ib = COURSE_ORDER.indexOf(b.id);
  return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
});

// Courses grouped by category, skipping ids not present in courses.json.
export const CATEGORIZED_COURSES: readonly { readonly name: string; readonly courses: readonly Course[] }[] = COURSE_CATEGORIES.map((cat) => ({
  name: cat.name,
  courses: cat.courseIds.map((id) => COURSES.find((c) => c.id === id)).filter((c): c is Course => Boolean(c)),
})).filter((cat) => cat.courses.length > 0);

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
