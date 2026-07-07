// Lightweight, fire-and-forget analytics. Posts events to the Clutch backend,
// which forwards them to the Telegram notifier. Never throws, never blocks UX.

const ENDPOINT = '/clutch/api/events';
const UID_KEY = 'clutch.uid';
const SESSION_FLAG = 'clutch.session.opened';

export type EventData = Record<string, unknown>;

function uid(): string {
  try {
    let id = localStorage.getItem(UID_KEY);
    if (!id) {
      id = `u_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem(UID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export function track(event: string, data?: EventData): void {
  try {
    const body = JSON.stringify({ event, uid: uid(), ts: Date.now(), data });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* analytics is best-effort — swallow everything */
  }
}

// Fires once per browser session (survives client-side navigation, resets on tab reopen).
export function trackAppOpen(data?: EventData): void {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    /* ignore — still send once per load below */
  }
  track('app_opened', data);
}

export function trackGameStart(game: string, tournament?: string): void {
  track('game_started', { game, tournament });
}

export function trackGameEnd(game: string, tournament: string | undefined, result: EventData): void {
  track('game_ended', { game, tournament, ...result });
}

export function trackShare(game: string): void {
  track('shared', { game });
}
