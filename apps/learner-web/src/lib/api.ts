import { getInitData } from './telegram';

// Read lesson ids per course. { [courseId]: string[] }
export type ReadMap = Record<string, string[]>;

type LearnerEvent =
  | { readonly type: 'open' }
  | { readonly type: 'lesson_complete'; readonly courseId: string; readonly courseTitle: string; readonly lessonId: string; readonly lessonTitle: string }
  | { readonly type: 'course_complete'; readonly courseId: string; readonly courseTitle: string };

function authHeaders(initData: string, json = false): Record<string, string> {
  return { 'X-Telegram-Init-Data': initData, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

// Fire-and-forget analytics. Notifier events must never surface an error to the
// user or block the UI, so failures are swallowed intentionally.
export function trackEvent(event: LearnerEvent): void {
  const initData = getInitData();
  if (!initData) return; // not inside Telegram — nothing to authenticate with
  fetch('/api/learner/events', {
    method: 'POST',
    headers: authHeaders(initData, true),
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}

// Load the user's cross-device progress from MongoDB. Resolves to null when the
// request fails or we're outside Telegram — callers treat null as "start empty".
export async function fetchProgress(): Promise<ReadMap | null> {
  const initData = getInitData();
  if (!initData) return null;
  try {
    const res = await fetch('/api/learner/progress', { headers: authHeaders(initData) });
    if (!res.ok) return null;
    const data = (await res.json()) as { courses?: ReadMap };
    return data.courses ?? {};
  } catch {
    return null;
  }
}

// Persist one course's read-list. Retries once, then gives up silently so a toggle
// never throws in the UI.
export async function saveCourseProgress(courseId: string, lessonIds: string[]): Promise<void> {
  const initData = getInitData();
  if (!initData) return;
  const attempt = () =>
    fetch(`/api/learner/progress/${encodeURIComponent(courseId)}`, {
      method: 'PUT',
      headers: authHeaders(initData, true),
      body: JSON.stringify({ lessonIds }),
      keepalive: true,
    });
  try {
    const res = await attempt();
    if (!res.ok) await attempt();
  } catch {
    try {
      await attempt();
    } catch {
      /* give up — progress will re-sync on next toggle */
    }
  }
}
