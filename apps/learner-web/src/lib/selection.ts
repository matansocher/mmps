import { CURRICULUM } from './bites.data';
import { biteStatus, isDue } from './scheduler';
import type { LearnerProgress } from './types';

export const DAILY_BITE_COUNT = 3;

// The next N curriculum bites the learner hasn't mastered yet, in curriculum order.
// Due (resurfaced) bites are prioritized first, then brand-new bites, then still-learning ones.
export function selectTodayBites(progress: LearnerProgress, now: Date = new Date(), count: number = DAILY_BITE_COUNT): string[] {
  const due: string[] = [];
  const fresh: string[] = [];
  const learning: string[] = [];

  for (const id of CURRICULUM) {
    const state = progress.states[id];
    const status = biteStatus(state, now);
    if (status === 'due') due.push(id);
    else if (status === 'new') fresh.push(id);
    else if (status === 'learning') learning.push(id);
  }

  return [...due, ...fresh, ...learning].slice(0, count);
}

// All bites currently due for spaced-repetition review.
export function selectReviewQueue(progress: LearnerProgress, now: Date = new Date()): string[] {
  return CURRICULUM.filter((id) => isDue(progress.states[id], now));
}

// Whether the learner has anything left to study/review today.
export function hasWorkToday(progress: LearnerProgress, now: Date = new Date()): boolean {
  return selectTodayBites(progress, now).length > 0;
}
