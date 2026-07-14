const ENDPOINT = '/israel-geo/api/events';
const UID_KEY = 'israel-geo.uid';
const SESSION_FLAG = 'israel-geo.session.opened';

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

export function track(event: string, data?: Record<string, unknown>): void {
  try {
    const body = JSON.stringify({ event, uid: uid(), data });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    // Analytics is deliberately best-effort.
  }
}

export function trackAppOpen(): void {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // Still send the event when session storage is unavailable.
  }
  track('app_opened');
}
