import type { LearnerBiteState, LearnerProgress, LearnerProgressDocument, LearnerRating, LearnerSyncData } from '../types';

export type LearnerProgressResponse = { readonly progress: LearnerProgress };
export type LearnerApiError = { readonly error: string };

const RATINGS: ReadonlyArray<LearnerRating> = ['got_it', 'fuzzy', 'nope'];

export function toProgressDto(doc: LearnerProgressDocument | null): LearnerProgress {
  if (!doc) return { states: {}, streak: 0, lastStudyDate: null, updatedAt: null };
  return {
    states: doc.states ?? {},
    streak: doc.streak ?? 0,
    lastStudyDate: doc.lastStudyDate ?? null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseBiteState(value: unknown): LearnerBiteState | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!isString(v.biteId)) return null;
  const rating = v.rating === null || RATINGS.includes(v.rating as LearnerRating) ? (v.rating as LearnerRating | null) : null;
  return {
    biteId: v.biteId,
    rating,
    readAt: isString(v.readAt) ? v.readAt : null,
    dueAt: isString(v.dueAt) ? v.dueAt : null,
    reps: typeof v.reps === 'number' ? v.reps : 0,
    gotItStreak: typeof v.gotItStreak === 'number' ? v.gotItStreak : 0,
    quizPassed: v.quizPassed === true,
  };
}

export function parseSyncBody(body: unknown): LearnerSyncData | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const rawStates = b.states;
  const states: Record<string, LearnerBiteState> = {};
  if (rawStates && typeof rawStates === 'object') {
    for (const [id, raw] of Object.entries(rawStates as Record<string, unknown>)) {
      const parsed = parseBiteState(raw);
      if (parsed) states[id] = parsed;
    }
  }
  return {
    states,
    streak: typeof b.streak === 'number' ? b.streak : 0,
    lastStudyDate: isString(b.lastStudyDate) ? b.lastStudyDate : null,
    updatedAt: isString(b.updatedAt) ? b.updatedAt : null,
  };
}
