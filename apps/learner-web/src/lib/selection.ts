import { CURRICULUM } from './bites.data';
import { biteStatus, isDue, localDateKey } from './scheduler';
import { loadDailyPlan, saveDailyPlan } from './storage';
import type { BiteState, LearnerProgress } from './types';

export const DAILY_BITE_COUNT = 3;

// A bite counts as "completed today" once the learner has rated it (finished the recall check)
// and that rating happened on today's local calendar date. Merely opening a bite (markRead sets
// readAt without a rating) does not count, so it won't vanish before the learner finishes it.
export function isCompletedToday(state: BiteState | undefined, now: Date = new Date()): boolean {
  if (!state || state.rating === null || !state.readAt) return false;
  return localDateKey(new Date(state.readAt)) === localDateKey(now);
}

// Candidate bites to study, in curriculum order: due (resurfaced) first, then brand-new,
// then still-learning. Bites already completed today are excluded.
export function selectTodayBites(progress: LearnerProgress, now: Date = new Date(), count: number = DAILY_BITE_COUNT): string[] {
  const due: string[] = [];
  const fresh: string[] = [];
  const learning: string[] = [];

  for (const id of CURRICULUM) {
    const state = progress.states[id];
    if (isCompletedToday(state, now)) continue;
    const status = biteStatus(state, now);
    if (status === 'due') due.push(id);
    else if (status === 'new') fresh.push(id);
    else if (status === 'learning') learning.push(id);
  }

  return [...due, ...fresh, ...learning].slice(0, count);
}

// The fixed set of bites for today. The chosen ids are anchored once per local day (persisted),
// so completing one shrinks the list (3 -> 2 -> 1 -> done) instead of backfilling a new bite.
// A new day (or an empty/finished plan) picks a fresh set of up to DAILY_BITE_COUNT bites.
export function getTodayPlanBites(progress: LearnerProgress, now: Date = new Date()): string[] {
  const today = localDateKey(now);
  const stored = loadDailyPlan();

  let planIds: string[];
  if (stored && stored.date === today && stored.ids.length > 0) {
    planIds = stored.ids.slice();
  } else {
    planIds = selectTodayBites(progress, now);
    saveDailyPlan({ date: today, ids: planIds });
  }

  // Show only plan bites that are still outstanding today; drop any completed today.
  return planIds.filter((id) => !isCompletedToday(progress.states[id], now));
}

// All bites currently due for spaced-repetition review.
export function selectReviewQueue(progress: LearnerProgress, now: Date = new Date()): string[] {
  return CURRICULUM.filter((id) => isDue(progress.states[id], now));
}

// Whether the learner has anything left to study/review today.
export function hasWorkToday(progress: LearnerProgress, now: Date = new Date()): boolean {
  return getTodayPlanBites(progress, now).length > 0;
}
