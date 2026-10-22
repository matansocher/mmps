import { LEARNER_CATALOG, LEARNER_GUIDES } from '../learner-catalog';
import { LEARNER_QUESTIONS } from '../learner-questions';
import type { GuideId, LearnerProgress, PracticeAttempt, PracticeDifficulty, PracticeGrade, PracticeQuestionStats, PracticeScope, PracticeVerdict } from '../types';

export type PracticeScopeLessonDto = {
  readonly id: string;
  readonly guide: GuideId;
  readonly title: string;
  readonly isReference: boolean;
  readonly questionCount: number;
  readonly attempted: number;
  readonly averageScore: number | null;
};

export type PracticeScopeResponse = {
  readonly guides: ReadonlyArray<{ readonly id: GuideId; readonly label: string; readonly icon: string; readonly questionCount: number }>;
  readonly lessons: readonly PracticeScopeLessonDto[];
  readonly totals: { readonly questions: number; readonly attempted: number; readonly mastered: number; readonly due: number };
};

export type PracticeMessageDto = { readonly role: 'user' | 'assistant'; readonly content: string; readonly createdAt: string };

export type PracticeAttemptDto = {
  readonly id: string;
  readonly status: PracticeAttempt['status'];
  readonly scope: PracticeScope;
  readonly question: {
    readonly id: string;
    readonly text: string;
    readonly guide: GuideId;
    readonly difficulty: PracticeDifficulty;
    // Hidden until graded so the lesson title can't hint at the answer.
    readonly biteId: string | null;
    readonly lessonTitle: string | null;
  };
  readonly answer: string | null;
  readonly answerSource: PracticeAttempt['answerSource'] | null;
  readonly grade: PracticeGrade | null;
  readonly messages: readonly PracticeMessageDto[];
  readonly createdAt: string;
  readonly gradedAt: string | null;
};

export type PracticeAttemptSummaryDto = {
  readonly id: string;
  readonly questionText: string;
  readonly guide: GuideId;
  readonly biteId: string;
  readonly lessonTitle: string;
  readonly difficulty: PracticeDifficulty;
  readonly score: number;
  readonly verdict: PracticeVerdict;
  readonly skipped: boolean;
  readonly createdAt: string;
};

export type PracticeAttemptResponse = { readonly attempt: PracticeAttemptDto; readonly progress?: LearnerProgress };

const QUESTIONS_BY_ID = new Map(LEARNER_QUESTIONS.map((q) => [q.id, q]));
const LESSON_IDS = new Set(LEARNER_QUESTIONS.map((q) => q.biteId));
const GUIDE_IDS = Object.keys(LEARNER_GUIDES) as GuideId[];
const MAX_SCOPE_LESSONS = 100;

export function toAttemptDto(attempt: PracticeAttempt): PracticeAttemptDto {
  const question = QUESTIONS_BY_ID.get(attempt.questionId);
  const graded = attempt.status === 'graded';
  return {
    id: String(attempt._id),
    status: attempt.status,
    scope: attempt.scope,
    question: {
      id: attempt.questionId,
      text: question?.question ?? 'This question is no longer available.',
      guide: question?.guide ?? 'system-design',
      difficulty: question?.difficulty ?? 'medium',
      biteId: graded ? attempt.biteId : null,
      lessonTitle: question?.lessonTitle ?? null,
    },
    answer: attempt.answer ?? null,
    answerSource: attempt.answerSource ?? null,
    grade: attempt.grade ?? null,
    messages: attempt.messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt.toISOString() })),
    createdAt: attempt.createdAt.toISOString(),
    gradedAt: attempt.gradedAt ? attempt.gradedAt.toISOString() : null,
  };
}

export function toAttemptSummaryDto(attempt: PracticeAttempt): PracticeAttemptSummaryDto {
  const question = QUESTIONS_BY_ID.get(attempt.questionId);
  return {
    id: String(attempt._id),
    questionText: question?.question ?? 'This question is no longer available.',
    guide: question?.guide ?? 'system-design',
    biteId: attempt.biteId,
    lessonTitle: question?.lessonTitle ?? '',
    difficulty: question?.difficulty ?? 'medium',
    score: attempt.grade?.score ?? 0,
    verdict: attempt.grade?.verdict ?? 'incorrect',
    skipped: attempt.grade?.skipped ?? false,
    createdAt: attempt.createdAt.toISOString(),
  };
}

export function toScopeResponse(stats: readonly PracticeQuestionStats[], now: Date): PracticeScopeResponse {
  const statsByQuestion = new Map(stats.filter((s) => QUESTIONS_BY_ID.has(s.questionId)).map((s) => [s.questionId, s]));
  const lessons = LEARNER_CATALOG.filter((b) => LESSON_IDS.has(b.id)).map((b) => {
    const questions = LEARNER_QUESTIONS.filter((q) => q.biteId === b.id);
    const lessonStats = questions.map((q) => statsByQuestion.get(q.id)).filter(Boolean);
    return {
      id: b.id,
      guide: b.guide,
      title: b.title,
      isReference: b.isReference,
      questionCount: questions.length,
      attempted: lessonStats.length,
      averageScore: lessonStats.length ? Math.round(lessonStats.reduce((sum, s) => sum + s.lastScore, 0) / lessonStats.length) : null,
    };
  });
  const all = [...statsByQuestion.values()];
  return {
    guides: GUIDE_IDS.map((id) => ({ id, ...LEARNER_GUIDES[id], questionCount: LEARNER_QUESTIONS.filter((q) => q.guide === id).length })),
    lessons,
    totals: {
      questions: LEARNER_QUESTIONS.length,
      attempted: all.length,
      mastered: all.filter((s) => s.lastScore >= 80).length,
      due: all.filter((s) => s.lastScore < 80 && s.dueAt.getTime() <= now.getTime()).length,
    },
  };
}

export function parseScope(value: unknown): PracticeScope | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const readOnly = v.readOnly === true;
  if (v.kind === 'all') return { kind: 'all', readOnly };
  if (v.kind === 'guides' && Array.isArray(v.guides)) {
    const guides = [...new Set(v.guides.filter((g): g is GuideId => GUIDE_IDS.includes(g as GuideId)))];
    return guides.length ? { kind: 'guides', guides, readOnly } : null;
  }
  if (v.kind === 'lessons' && Array.isArray(v.biteIds)) {
    const biteIds = [...new Set(v.biteIds.filter((id): id is string => typeof id === 'string' && LESSON_IDS.has(id)))].slice(0, MAX_SCOPE_LESSONS);
    return biteIds.length ? { kind: 'lessons', biteIds } : null;
  }
  return null;
}
