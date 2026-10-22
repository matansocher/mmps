import type { GuideId, LearnerProgress } from './types';

export type PracticeScope =
  | { readonly kind: 'all'; readonly readOnly?: boolean }
  | { readonly kind: 'guides'; readonly guides: readonly GuideId[]; readonly readOnly?: boolean }
  | { readonly kind: 'lessons'; readonly biteIds: readonly string[] };

export type PracticeVerdict = 'correct' | 'partial' | 'incorrect';

export type PracticeDifficulty = 'easy' | 'medium' | 'hard';

export type PracticeGrade = {
  readonly score: number;
  readonly verdict: PracticeVerdict;
  readonly coveredPoints: readonly string[];
  readonly missedPoints: readonly string[];
  readonly incorrectClaims: readonly string[];
  readonly explanation: string;
  readonly referenceAnswer: string;
  readonly skipped: boolean;
};

export type PracticeAnswerSource = 'text' | 'voice';

export type PracticeMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly createdAt: string;
};

export type PracticeAttempt = {
  readonly id: string;
  readonly status: 'awaiting_answer' | 'graded';
  readonly scope: PracticeScope;
  readonly question: {
    readonly id: string;
    readonly text: string;
    readonly guide: GuideId;
    readonly difficulty: PracticeDifficulty;
    readonly biteId: string | null;
    readonly lessonTitle: string | null;
  };
  readonly answer: string | null;
  readonly answerSource: PracticeAnswerSource | null;
  readonly grade: PracticeGrade | null;
  readonly messages: readonly PracticeMessage[];
  readonly createdAt: string;
  readonly gradedAt: string | null;
};

export type PracticeAttemptSummary = {
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

export type PracticeScopeLesson = {
  readonly id: string;
  readonly guide: GuideId;
  readonly title: string;
  readonly isReference: boolean;
  readonly questionCount: number;
  readonly attempted: number;
  readonly averageScore: number | null;
};

export type PracticeScopeInfo = {
  readonly guides: ReadonlyArray<{ readonly id: GuideId; readonly label: string; readonly icon: string; readonly questionCount: number }>;
  readonly lessons: readonly PracticeScopeLesson[];
  readonly totals: { readonly questions: number; readonly attempted: number; readonly mastered: number; readonly due: number };
};

export type PracticeAttemptResponse = { readonly attempt: PracticeAttempt; readonly progress?: LearnerProgress };

export const ANSWER_MAX_CHARS = 4000;
export const FOLLOWUP_MAX_CHARS = 2000;
export const MAX_SCOPE_LESSONS = 100;

const VERDICT_LABELS: Record<PracticeVerdict, string> = {
  correct: 'Correct',
  partial: 'Partially correct',
  incorrect: 'Not quite',
};

export function verdictLabel(grade: Pick<PracticeGrade, 'verdict' | 'skipped'>): string {
  return grade.skipped ? 'Skipped' : VERDICT_LABELS[grade.verdict];
}

export function verdictTone(grade: Pick<PracticeGrade, 'verdict' | 'skipped'>): 'good' | 'mid' | 'bad' | 'muted' {
  if (grade.skipped) return 'muted';
  if (grade.verdict === 'correct') return 'good';
  if (grade.verdict === 'partial') return 'mid';
  return 'bad';
}

export function scopeLabel(scope: PracticeScope, guideLabels: Partial<Record<GuideId, string>>, lessonTitles?: ReadonlyMap<string, string>): string {
  if (scope.kind === 'all') return scope.readOnly ? 'Lessons you have read' : 'All lessons';
  if (scope.kind === 'guides') {
    const names = scope.guides.map((g) => guideLabels[g] ?? g).join(' + ');
    return scope.readOnly ? `${names} · read only` : names;
  }
  if (scope.biteIds.length === 1) return lessonTitles?.get(scope.biteIds[0]) ?? '1 lesson';
  return `${scope.biteIds.length} lessons`;
}

const ERROR_MESSAGES: Record<string, string> = {
  no_identity: 'Open Learner from Telegram to practice — answers are graded on the server.',
  no_read_lessons: "You haven't read any lessons in this scope yet. Turn off “Only lessons I've read” or read a lesson first.",
  no_questions: 'There are no practice questions in this selection. Try a wider scope.',
  attempt_not_found: 'This practice question could not be found.',
  already_graded: 'This answer was already graded.',
  attempt_not_graded: 'Answer the question first, then you can ask follow-ups.',
  too_many_followups: "You've reached the follow-up limit for this question. Start a new one to keep going.",
  grading_failed: "The grader couldn't score that right now. Your answer is kept — try again.",
  too_many_requests: "You're going fast! Take a short breather and try again in a bit.",
  question_not_found: 'This question was retired from the course. Start a new one.',
  payload_too_large: 'That recording is too long. Keep voice answers under a few minutes.',
  invalid_audio: "Couldn't read that recording. Try again or type your answer.",
  practice_transcribe_failed: "Couldn't transcribe that recording. Try again or type your answer.",
  empty_transcript: "Didn't catch anything in that recording. Try again a little closer to the mic.",
  invalid_answer: 'Write an answer first (up to 4,000 characters).',
  invalid_message: 'Write a message first (up to 2,000 characters).',
  tutor_failed: "The tutor couldn't answer right now. Try sending your message again.",
  stream_interrupted: 'The reply was interrupted. Try sending your message again.',
  invalid_scope: 'That selection is not valid. Pick at least one course or lesson.',
};

export function practiceErrorMessage(code: string | undefined): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code === 'request_failed_429') return ERROR_MESSAGES.too_many_requests;
  if (code === 'request_failed_413') return ERROR_MESSAGES.payload_too_large;
  return 'Something went wrong. Please try again.';
}

export function scoreColorVar(score: number): string {
  if (score >= 80) return 'var(--accent-2)';
  if (score >= 50) return 'var(--accent-4)';
  return 'var(--danger)';
}

export function parseLessonsParam(value: string | null, knownIds: ReadonlySet<string>): string[] {
  if (!value) return [];
  const ids = value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => knownIds.has(id));
  return [...new Set(ids)].slice(0, MAX_SCOPE_LESSONS);
}

const LAST_SCOPE_KEY = 'learner:practice-scope';

export function loadLastScope(): PracticeScope | null {
  try {
    const raw = localStorage.getItem(LAST_SCOPE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PracticeScope;
    if (parsed?.kind === 'all' || (parsed?.kind === 'guides' && Array.isArray(parsed.guides)) || (parsed?.kind === 'lessons' && Array.isArray(parsed.biteIds))) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveLastScope(scope: PracticeScope): void {
  try {
    localStorage.setItem(LAST_SCOPE_KEY, JSON.stringify(scope));
  } catch {
    // ignore
  }
}

// Questions answered in a row from one setup, so the chat can show session progress.
const SESSION_KEY = 'learner:practice-session';
const SESSION_MAX = 12;

export type PracticeTone = ReturnType<typeof verdictTone>;

export type PracticeSessionEntry = {
  readonly id: string;
  readonly tone: PracticeTone | null;
};

function readSession(): PracticeSessionEntry[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSession(entries: readonly PracticeSessionEntry[]): PracticeSessionEntry[] {
  const trimmed = entries.slice(-SESSION_MAX);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
  return trimmed;
}

export function startPracticeSession(attemptId: string): void {
  writeSession([{ id: attemptId, tone: null }]);
}

export function continuePracticeSession(attemptId: string): void {
  const entries = readSession();
  if (!entries.some((e) => e.id === attemptId)) writeSession([...entries, { id: attemptId, tone: null }]);
}

// Opening an attempt that isn't part of the stored session (e.g. from history) starts a fresh one.
export function syncPracticeSession(attemptId: string, tone: PracticeTone | null): PracticeSessionEntry[] {
  const entries = readSession();
  if (!entries.some((e) => e.id === attemptId)) return writeSession([{ id: attemptId, tone }]);
  return writeSession(entries.map((e) => (e.id === attemptId && tone ? { ...e, tone } : e)));
}
