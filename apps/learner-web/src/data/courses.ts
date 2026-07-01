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

// Recommended learning order (foundations -> AI apps -> AI systems -> backend -> language).
const COURSE_ORDER: readonly string[] = [
  // AI fundamentals
  'embeddings-vector-databases-course',
  'prompt-engineering-course',
  'rag-deep-dive-course',
  'context-engineering-course',
  // Building AI apps
  'structured-output-course',
  'mcp-tool-use-course',
  'multi-agent-patterns-course',
  'finetuning-vs-rag-vs-prompting-course',
  // AI systems & operations
  'llm-inference-serving-course',
  'llm-eval-observability-course',
  'llm-security-course',
  'ai-system-design-course',
  // Backend systems
  'distributed-systems-course',
  'event-driven-architecture-course',
  // Language depth
  'typescript-deep-dive-course',
  'nodejs-internals-course',
];

export const ORDERED_COURSES: readonly Course[] = [...COURSES].sort((a, b) => {
  const ia = COURSE_ORDER.indexOf(a.id);
  const ib = COURSE_ORDER.indexOf(b.id);
  return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
});

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
