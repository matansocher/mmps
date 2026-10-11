import { type GameMode, modeTitle } from '../game/modes';
import type { RoundResult } from '../game/progression';
import { authHeaders } from './auth';

// Fire-and-forget play events for the Worldly bot's notifier.

type GlobeEvent =
  | { readonly event: 'opened' }
  | { readonly event: 'round_started'; readonly mode: string }
  | { readonly event: 'round_finished'; readonly mode: string; readonly score: number; readonly outOf: number };

let currentMode = '';

function send(event: GlobeEvent): void {
  const headers = authHeaders();
  if (!headers) return;
  void fetch('/api/worldly/globe/events', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(event), keepalive: true }).catch(() => undefined);
}

export function trackOpened(): void {
  send({ event: 'opened' });
}

export function trackRoundStarted(mode: GameMode): void {
  currentMode = modeTitle(mode);
  send({ event: 'round_started', mode: currentMode });
}

export function trackRoundFinished(round: RoundResult): void {
  send({ event: 'round_finished', mode: currentMode || round.kind, score: round.score, outOf: round.outOf });
}
