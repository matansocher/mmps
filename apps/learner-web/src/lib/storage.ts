import { emptyProgress } from './scheduler';
import type { LearnerProgress } from './types';

const STORAGE_KEY = 'learner:progress:v1';

export function loadLocalProgress(): LearnerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<LearnerProgress>;
    return {
      states: parsed.states ?? {},
      streak: parsed.streak ?? 0,
      lastStudyDate: parsed.lastStudyDate ?? null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return emptyProgress();
  }
}

export function saveLocalProgress(progress: LearnerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage full / unavailable — non-fatal, server sync is the durable copy
  }
}

const DAILY_PLAN_KEY = 'learner:dailyplan:v1';

export type DailyPlan = {
  readonly date: string; // YYYY-MM-DD (Asia/Jerusalem)
  readonly ids: ReadonlyArray<string>;
};

export function loadDailyPlan(): DailyPlan | null {
  try {
    const raw = localStorage.getItem(DAILY_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyPlan>;
    if (!parsed.date || !Array.isArray(parsed.ids)) return null;
    return { date: parsed.date, ids: parsed.ids };
  } catch {
    return null;
  }
}

export function saveDailyPlan(plan: DailyPlan): void {
  try {
    localStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(plan));
  } catch {
    // non-fatal
  }
}
