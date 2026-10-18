import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BITES } from '../../../../apps/learner-web/src/lib/bites.data';
import { LEARNER_CATALOG } from '../learner-catalog';
import { LEARNER_QUESTION_DIFFICULTY } from '../learner-question-difficulty';
import { LEARNER_LESSON_CONTEXT, LEARNER_QUESTIONS } from '../learner-questions';
import { buildQuestionBank, plainText, renderQuestionBankModule } from './question-bank.builder';

describe('question bank', () => {
  test('learner-questions.ts is in sync with bites.data.ts (run `npm run gen:learner-questions`)', () => {
    const generated = renderQuestionBankModule(buildQuestionBank(BITES, LEARNER_QUESTION_DIFFICULTY));
    const committed = readFileSync(path.resolve(__dirname, '../learner-questions.ts'), 'utf8');
    expect(committed).toEqual(generated);
  });

  test('every question has non-empty text, a unique id and a lesson in the catalog', () => {
    const catalogIds = new Set(LEARNER_CATALOG.map((b) => b.id));
    const ids = new Set<string>();
    for (const q of LEARNER_QUESTIONS) {
      expect(q.question.length).toBeGreaterThan(5);
      expect(q.referenceAnswer.length).toBeGreaterThan(5);
      expect(catalogIds.has(q.biteId)).toEqual(true);
      expect(ids.has(q.id)).toEqual(false);
      ids.add(q.id);
    }
  });

  test('every question has an explicit difficulty label (add it to learner-question-difficulty.ts)', () => {
    expect(LEARNER_QUESTIONS.filter((q) => !LEARNER_QUESTION_DIFFICULTY[q.id]).map((q) => q.id)).toEqual([]);
    expect(Object.keys(LEARNER_QUESTION_DIFFICULTY).filter((id) => !LEARNER_QUESTIONS.some((q) => q.id === id))).toEqual([]);
  });

  test('lesson context excludes the Q&A block', () => {
    for (const q of LEARNER_QUESTIONS.slice(0, 20)) {
      expect(LEARNER_LESSON_CONTEXT[q.biteId]).not.toContain(q.referenceAnswer);
    }
  });
});

describe('buildQuestionBank()', () => {
  const html = `<p>Body &amp; more</p><h2>Interview Q&amp;A</h2>
    <details class="qa"><summary>What is <code>x</code>?</summary>
        <div class="answer"><p>It&#39;s &lt;y&gt;.</p></div></details>
    <details class="qa"><summary>Second?</summary>
        <div class="answer">Two</div></details>
    <div class="next"><a href="#">Next</a></div>`;

  test('extracts numbered questions and the lesson context', () => {
    const bank = buildQuestionBank([{ id: 'g:a', guide: 'system-design', title: 'A', html }], { 'g:a#q1': 'easy' });
    expect(bank.questions).toEqual([
      { id: 'g:a#q1', biteId: 'g:a', guide: 'system-design', lessonTitle: 'A', question: 'What is x?', referenceAnswer: "It's <y>.", difficulty: 'easy' },
      { id: 'g:a#q2', biteId: 'g:a', guide: 'system-design', lessonTitle: 'A', question: 'Second?', referenceAnswer: 'Two', difficulty: 'medium' },
    ]);
    expect(bank.contexts).toEqual({ 'g:a': 'Body & more' });
  });

  test('skips lessons without questions', () => {
    expect(buildQuestionBank([{ id: 'g:b', guide: 'system-design', title: 'B', html: '<p>none</p>' }])).toEqual({ questions: [], contexts: {} });
  });
});

describe('plainText()', () => {
  test.each([
    { html: '<b>a</b>  b', expected: 'a b' },
    { html: '&amp;lt;', expected: '&lt;' },
    { html: 'end <em>x</em> .', expected: 'end x.' },
  ])('$html -> $expected', ({ html, expected }) => {
    expect(plainText(html)).toEqual(expected);
  });
});
