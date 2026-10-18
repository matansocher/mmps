import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { BITES } from '../apps/learner-web/src/lib/bites.data';
import { LEARNER_QUESTION_DIFFICULTY } from '../src/features/learner/learner-question-difficulty';
import { buildQuestionBank, renderQuestionBankModule } from '../src/features/learner/practice/question-bank.builder';

const target = path.resolve('src/features/learner/learner-questions.ts');
const bank = buildQuestionBank(BITES, LEARNER_QUESTION_DIFFICULTY);
writeFileSync(target, renderQuestionBankModule(bank));
console.log(`Wrote ${bank.questions.length} questions from ${Object.keys(bank.contexts).length} lessons to ${target}`);
