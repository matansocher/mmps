import { z } from 'zod';
import type { Level, Topic } from '@shared/stacker';

// --- Request schemas ---

export const StartSessionBody = z.object({
  topic: z.string(),
  level: z.string(),
});
export type StartSessionBody = z.infer<typeof StartSessionBody>;

export const AnswerBody = z.object({
  questionId: z.string(),
  selectedOption: z.number().int().optional(),
  text: z.string().optional(),
});
export type AnswerBody = z.infer<typeof AnswerBody>;

// --- Response DTOs (UI-shaped; no Mongo internals) ---

export type MeResponse = {
  user: {
    telegramUserId: number;
    username?: string;
    xp: number;
    streakCount: number;
    heartsRemaining: number;
    heartsMax: number;
  };
  activeSession: { id: string; topic: Topic; level: Level } | null;
};

export type TopicsResponse = {
  topics: Array<{
    topic: Topic;
    label: string;
    levels: Array<{ level: Level; label: string; questionCount: number }>;
  }>;
};

export type StartSessionResponse =
  | { ok: true; sessionId: string; totalQuestions: number }
  | { ok: false; reason: 'out_of_hearts' | 'no_questions' };

export type QuestionDto =
  | { id: string; type: 'multiple_choice'; question: string; options: readonly string[] }
  | { id: string; type: 'code_output'; question: string; codeSnippet: string; options: readonly string[] }
  | { id: string; type: 'fill_in'; question: string; codeSnippet?: string };

export type NextQuestionResponse =
  | { complete: false; question: QuestionDto; progress: { answered: number; remaining: number; total: number } }
  | { complete: true };

export type AnswerResponse = {
  correct: boolean;
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation: string;
  heartsRemaining: number;
  outOfHearts: boolean;
};

export type AbandonResponse = { ok: true };
