import { Tool } from '@services/anthropic';

export type TriviaQuestionResult = {
  readonly question: string;
  readonly correctAnswer: string;
  readonly distractorAnswers: string[];
};

export const triviaToolInstructions = `
  You are generating trivia questions for a Telegram bot. Each question should be multiple-choice with 1 correct answer and 3 plausible incorrect answers. Focus on **medium to hard** difficulty. The goal is to help users learn and expand their knowledge.
  - Generate questions from various categories such as: Israeli history, culture, geography, language, inventions, global history, science, literature, philosophy, politics (historical), and nature.
  - ~50% of the questions should relate to **Israel** (its history, culture, geography, etc.).
  - Avoid easy or obvious questions. Make sure each question teaches something interesting or less commonly known.
  - Make incorrect answers believable and relevant to the topic (not silly or easily dismissible).
  - Avoid opinion-based or ambiguous questions.
`;

export const triviaTool: Tool = {
  name: 'generate_trivia_question',
  description: 'Generates a Hebrew quizzy question with one correct answer and three distractor answers',
  input_schema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'Hebrew quizzy question to be generated',
      },
      correctAnswer: {
        type: 'string',
        description: 'Correct answer to the quizzy question in Hebrew',
      },
      distractorAnswers: {
        type: 'array',
        description: '3 distractor answers to the quizzy question in Hebrew',
        items: {
          type: 'string',
        },
      },
    },
    required: ['question', 'correctAnswer', 'distractorAnswers'],
    additionalProperties: false,
  },
};
