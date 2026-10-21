import { PRACTICE_CORRECT_THRESHOLD, PRACTICE_RECENT_WINDOW } from '../constants';
import type { LearnerQuestion, PracticeDifficulty, PracticeQuestionStats, PracticeScope } from '../types';

const DUE_WEIGHT = 0.6;
const STALE_POOL_SIZE = 5;
const DIFFICULTY_RANK: Readonly<Record<PracticeDifficulty, number>> = { easy: 0, medium: 1, hard: 2 };

export function filterQuestionsByScope(questions: readonly LearnerQuestion[], scope: PracticeScope, readBiteIds?: ReadonlySet<string>): LearnerQuestion[] {
  let pool: LearnerQuestion[];
  if (scope.kind === 'lessons') {
    const ids = new Set(scope.biteIds);
    pool = questions.filter((q) => ids.has(q.biteId));
  } else if (scope.kind === 'guides') {
    const guides = new Set(scope.guides);
    pool = questions.filter((q) => guides.has(q.guide));
  } else {
    pool = [...questions];
  }
  if (scope.kind !== 'lessons' && scope.readOnly && readBiteIds) {
    pool = pool.filter((q) => readBiteIds.has(q.biteId));
  }
  return pool;
}

export type SelectQuestionInput = {
  readonly pool: readonly LearnerQuestion[];
  readonly stats: readonly PracticeQuestionStats[];
  readonly recentQuestionIds: readonly string[];
  readonly now: Date;
  readonly random?: () => number;
};

const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length) % items.length];

const isMastered = (stats: PracticeQuestionStats | undefined): boolean => stats !== undefined && stats.lastScore >= PRACTICE_CORRECT_THRESHOLD;

// Each lesson is a ladder: only its easiest tier that still has an unmastered question is open (plus the mastered tiers below it).
// A failed question keeps its tier open, so it's retried before anything harder; a fully mastered lesson opens every question for review.
export function unlockedQuestions(pool: readonly LearnerQuestion[], statsById: ReadonlyMap<string, PracticeQuestionStats>): LearnerQuestion[] {
  const frontierByLesson = new Map<string, number>();
  for (const q of pool) {
    if (isMastered(statsById.get(q.id))) continue;
    const rank = DIFFICULTY_RANK[q.difficulty];
    frontierByLesson.set(q.biteId, Math.min(frontierByLesson.get(q.biteId) ?? rank, rank));
  }
  return pool.filter((q) => DIFFICULTY_RANK[q.difficulty] <= (frontierByLesson.get(q.biteId) ?? Infinity));
}

// Within the unlocked questions: weak questions that are due come first (most of the time), then never-seen ones, then the stalest.
export function selectQuestion({ pool, stats, recentQuestionIds, now, random = Math.random }: SelectQuestionInput): LearnerQuestion | null {
  if (pool.length === 0) return null;
  const statsById = new Map(stats.map((s) => [s.questionId, s]));
  const unlocked = unlockedQuestions(pool, statsById);
  const recent = new Set(recentQuestionIds.slice(0, PRACTICE_RECENT_WINDOW));
  let candidates = unlocked.filter((q) => !recent.has(q.id));
  if (candidates.length === 0) {
    // Tiny ladders: just avoid asking the very same question twice in a row.
    candidates = unlocked.length > 1 ? unlocked.filter((q) => q.id !== recentQuestionIds[0]) : unlocked;
  }

  const due = candidates.filter((q) => {
    const s = statsById.get(q.id);
    return s && !isMastered(s) && s.dueAt.getTime() <= now.getTime();
  });
  const fresh = candidates.filter((q) => !statsById.has(q.id));

  if (due.length > 0 && (fresh.length === 0 || random() < DUE_WEIGHT)) return pick(due, random);
  if (fresh.length > 0) return pick(fresh, random);

  const stalest = [...candidates]
    .sort((a, b) => statsById.get(a.id).dueAt.getTime() - statsById.get(b.id).dueAt.getTime())
    .slice(0, STALE_POOL_SIZE);
  return pick(stalest, random);
}
