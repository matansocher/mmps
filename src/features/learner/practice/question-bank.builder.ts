import type { GuideId, LearnerQuestion, PracticeDifficulty } from '../types';

export type QuestionBankSourceBite = {
  readonly id: string;
  readonly guide: GuideId;
  readonly title: string;
  readonly html: string;
};

export type QuestionBank = {
  readonly questions: readonly LearnerQuestion[];
  readonly contexts: Readonly<Record<string, string>>;
};

const QA_RE = /<details class="qa">\s*<summary>([\s\S]*?)<\/summary>\s*<div class="answer">([\s\S]*?)<\/div>\s*<\/details>/g;
const QA_HEADING_RE = /<h2>Interview Q&amp;A<\/h2>/;
const LESSON_CONTEXT_MAX_CHARS = 5000;
const DEFAULT_DIFFICULTY: PracticeDifficulty = 'medium';

export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?)])/g, '$1')
    .trim();
}

// The lesson body without its Q&A block (so the tutor isn't handed every other answer) and nav links.
function lessonContext(html: string): string {
  const qaStart = html.search(QA_HEADING_RE);
  const body = (qaStart === -1 ? html : html.slice(0, qaStart)).replace(/<div class="next">[\s\S]*?<\/div>/g, '');
  const text = plainText(body);
  return text.length > LESSON_CONTEXT_MAX_CHARS ? `${text.slice(0, LESSON_CONTEXT_MAX_CHARS)}…` : text;
}

export function buildQuestionBank(bites: readonly QuestionBankSourceBite[], difficulty: Readonly<Record<string, PracticeDifficulty>> = {}): QuestionBank {
  const questions: LearnerQuestion[] = [];
  const contexts: Record<string, string> = {};
  for (const bite of bites) {
    const matches = [...bite.html.matchAll(QA_RE)];
    if (matches.length === 0) continue;
    matches.forEach((match, index) => {
      const id = `${bite.id}#q${index + 1}`;
      questions.push({
        id,
        biteId: bite.id,
        guide: bite.guide,
        lessonTitle: bite.title,
        question: plainText(match[1]),
        referenceAnswer: plainText(match[2]),
        difficulty: difficulty[id] ?? DEFAULT_DIFFICULTY,
      });
    });
    contexts[bite.id] = lessonContext(bite.html);
  }
  return { questions, contexts };
}

export function renderQuestionBankModule(bank: QuestionBank): string {
  return [
    '// AUTO-GENERATED from apps/learner-web/src/lib/bites.data.ts + learner-question-difficulty.ts by scripts/generate-learner-questions.ts.',
    '// Run `npm run gen:learner-questions` after the lessons change; hand edits will be lost.',
    "import type { LearnerQuestion } from './types';",
    '',
    `export const LEARNER_QUESTIONS: ReadonlyArray<LearnerQuestion> = ${JSON.stringify(bank.questions, null, 2)};`,
    '',
    `export const LEARNER_LESSON_CONTEXT: Readonly<Record<string, string>> = ${JSON.stringify(bank.contexts, null, 2)};`,
    '',
  ].join('\n');
}
