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
