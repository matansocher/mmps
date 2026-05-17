import { Logger } from '@core/utils';
import { countQuestions, insertQuestions } from './mongo';
import { LEVELS, Question, QUESTION_TYPES, TOPICS } from './types';

const logger = new Logger('seed-questions');

const SEED_QUESTIONS: readonly Question[] = [
  {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.INTERMEDIATE,
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    question: 'Which method returns a new array without mutating the original?',
    options: ['push', 'splice', 'map', 'sort'],
    correctOptionIndex: 2,
    explanation: '`map` returns a new array of the same length. `push` and `splice` mutate in place; `sort` mutates the array it is called on.',
    tags: ['arrays', 'immutability'],
  },
  {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.INTERMEDIATE,
    type: QUESTION_TYPES.CODE_OUTPUT,
    question: 'What does this code print?',
    codeSnippet: 'console.log([1, 2, 3].map(Number.parseInt));',
    options: ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', 'TypeError'],
    correctOptionIndex: 1,
    explanation: '`map` passes (value, index) to the callback. `parseInt("1", 0)` → 1; `parseInt("2", 1)` → NaN (radix 1 invalid); `parseInt("3", 2)` → NaN (3 not valid in base 2).',
    tags: ['parseInt', 'map', 'gotcha'],
  },
  {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.INTERMEDIATE,
    type: QUESTION_TYPES.FILL_IN,
    question: 'What does `typeof null` return? (one word)',
    acceptedAnswers: ['object'],
    explanation: '`typeof null === "object"` — a historical bug from JavaScript’s first implementation that was never fixed for backwards compatibility.',
    tags: ['typeof', 'gotcha'],
  },
];

export async function seedQuestionsIfEmpty(): Promise<void> {
  const existing = await countQuestions();
  if (existing > 0) {
    logger.log(`Questions collection has ${existing} docs — skipping seed`);
    return;
  }
  await insertQuestions(SEED_QUESTIONS);
  logger.log(`Seeded ${SEED_QUESTIONS.length} starter questions`);
}
