import { getInitData } from './telegram';

type LearnerEvent =
  | { readonly type: 'open' }
  | { readonly type: 'lesson_complete'; readonly courseId: string; readonly courseTitle: string; readonly lessonId: string; readonly lessonTitle: string }
  | { readonly type: 'course_complete'; readonly courseId: string; readonly courseTitle: string };

// Fire-and-forget analytics. Notifier events must never surface an error to the
// user or block the UI, so failures are swallowed intentionally.
export function trackEvent(event: LearnerEvent): void {
  const initData = getInitData();
  if (!initData) return; // not inside Telegram — nothing to authenticate with
  fetch('/api/learner/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
    },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}
