import { PRACTICE_CORRECT_THRESHOLD, PRACTICE_PARTIAL_THRESHOLD } from '../constants';
import type { PracticeGrade, PracticeQuestionStats, PracticeVerdict } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_INTERVAL_DAYS = 60;
const MAX_POINTS = 6;

const NON_ANSWERS = new Set(['', '?', '??', 'idk', 'i dont know', 'i do not know', 'dont know', 'no idea', 'not sure', 'skip', 'pass', 'no', 'none', 'לא יודע', 'לא יודעת', 'אין לי מושג']);

export function verdictForScore(score: number): PracticeVerdict {
  if (score >= PRACTICE_CORRECT_THRESHOLD) return 'correct';
  if (score >= PRACTICE_PARTIAL_THRESHOLD) return 'partial';
  return 'incorrect';
}

export function isNonAnswer(answer: string): boolean {
  const normalized = answer
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[.!,]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return NON_ANSWERS.has(normalized);
}

export function intervalDaysForScore(score: number, streak: number): number {
  if (score < PRACTICE_PARTIAL_THRESHOLD) return 1;
  if (score < PRACTICE_CORRECT_THRESHOLD) return 3;
  // `streak` already includes this correct answer, so the first correct answer waits 7 days.
  return Math.min(MAX_INTERVAL_DAYS, 7 * 2 ** Math.max(0, streak - 1));
}

type StatsKey = Pick<PracticeQuestionStats, '_id' | 'telegramUserId' | 'questionId' | 'biteId'>;

export function nextQuestionStats(prev: PracticeQuestionStats | null, key: StatsKey, score: number, now: Date): PracticeQuestionStats {
  const streak = score >= PRACTICE_CORRECT_THRESHOLD ? (prev?.streak ?? 0) + 1 : 0;
  return {
    ...key,
    attempts: (prev?.attempts ?? 0) + 1,
    lastScore: score,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    streak,
    lastAttemptAt: now,
    dueAt: new Date(now.getTime() + intervalDaysForScore(score, streak) * DAY_MS),
  };
}

// Model output — every field may be missing or malformed, so finalizeGrade normalizes it.
export type RawGrade = {
  readonly score?: number;
  readonly coveredPoints?: readonly string[];
  readonly missedPoints?: readonly string[];
  readonly incorrectClaims?: readonly string[];
  readonly explanation?: string;
};

const cleanPoints = (points: readonly string[] | undefined) =>
  (points ?? [])
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, MAX_POINTS);

export function finalizeGrade(raw: RawGrade, referenceAnswer: string): PracticeGrade {
  const score = Math.max(0, Math.min(100, Math.round(Number.isFinite(raw.score) ? raw.score : 0)));
  return {
    score,
    verdict: verdictForScore(score),
    coveredPoints: cleanPoints(raw.coveredPoints),
    missedPoints: cleanPoints(raw.missedPoints),
    incorrectClaims: cleanPoints(raw.incorrectClaims),
    explanation: raw.explanation?.trim() ?? '',
    referenceAnswer,
    skipped: false,
  };
}

export function skippedGrade(referenceAnswer: string): PracticeGrade {
  return {
    score: 0,
    verdict: 'incorrect',
    coveredPoints: [],
    missedPoints: [],
    incorrectClaims: [],
    explanation: 'No answer given — read the reference answer below, then ask me anything about it.',
    referenceAnswer,
    skipped: true,
  };
}
