import { hasRemoteIdentity, request } from './api';
import { readJson, writeJson } from './progress';
import { telegram } from './telegram';
import { newId } from './utils';

const EVENTS = [
  'first_game_started',
  'app_open',
  'onboarding_started',
  'onboarding_skipped',
  'onboarding_completed',
  'game_started',
  'first_input',
  'game_completed',
  'game_abandoned',
  'replay_clicked',
  'next_round_clicked',
  'daily_session_completed',
  'goal_reached',
  'sync_failed',
  'reminder_opt_in',
  'reminder_opt_out',
  'reminder_open',
  'challenge_shared',
] as const;
export type EventName = (typeof EVENTS)[number];
type EventRecord = {
  readonly id: string;
  readonly player: string;
  readonly name: EventName;
  readonly at: string;
  readonly session: string;
  readonly properties: Record<string, string | number | boolean | undefined>;
};
let session = '';
let returning = false;
let source = 'direct';
let sending = false;
export function track(name: EventName, properties: Record<string, string | number | boolean | undefined> = {}): void {
  if (!readJson('mindloop:analytics-enabled', true) || !EVENTS.includes(name)) return;
  if (!session) {
    session = newId();
    returning = readJson<unknown[]>('mindloop:history', []).length > 0;
    const query = new URLSearchParams(location.search);
    source = query.get('source') === 'reminder' ? 'reminder' : query.get('mode') === 'daily' ? 'challenge' : 'direct';
  }
  let player = readJson<string>('mindloop:analytics-id', '');
  if (!player) {
    player = newId();
    writeJson('mindloop:analytics-id', player);
  }
  const events = readJson<EventRecord[]>('mindloop:events', []);
  events.push({
    id: newId(),
    player,
    session,
    name,
    at: new Date().toISOString(),
    properties: {
      ...properties,
      returning,
      source,
      version: 2,
      launch: telegram()?.initData ? 'telegram' : 'browser',
      width: innerWidth,
      height: innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  writeJson('mindloop:events', events.slice(-100));
  void flushEvents();
}
export async function flushEvents(): Promise<void> {
  if (sending || !navigator.onLine) return;
  const valid = readJson<EventRecord[]>('mindloop:events', []).filter((e) => Date.parse(e.at) > Date.now() - 30 * 86400000 && Date.parse(e.at) < Date.now() + 300000);
  writeJson('mindloop:events', valid);
  const events = valid.slice(0, 30);
  if (!events.length) return;
  sending = true;
  try {
    const response = hasRemoteIdentity()
      ? await sendAuthenticated(events)
      : await fetch('/api/mindloop/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events }), signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const ids = new Set(events.map((e) => e.id));
      writeJson(
        'mindloop:events',
        readJson<EventRecord[]>('mindloop:events', []).filter((e) => !ids.has(e.id)),
      );
    }
  } catch {
    /* Retry the bounded queue on the next event or visit. */
  } finally {
    sending = false;
  }
}

async function sendAuthenticated(events: EventRecord[]): Promise<{ ok: boolean }> {
  await request('/api/mindloop/player/events', { method: 'POST', body: JSON.stringify({ events }) });
  return { ok: true };
}
