export type Topic = 'javascript' | 'typescript' | 'node' | 'python' | 'algorithms' | 'sql';
export type Level = 'beginner' | 'intermediate' | 'advanced';

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
