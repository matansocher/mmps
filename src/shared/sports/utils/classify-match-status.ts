import type { MatchDetails } from '@services/scores-365';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

const FINISHED_HINTS = ['הסתיים', 'הסתיימה', 'לאחר הארכה', 'לאחר פנדלים', 'finished', 'ft', 'ended', 'after extra time', 'after penalties', 'aet', 'pen'];

export function classifyMatchStatus(m: MatchDetails): MatchStatus {
  const lower = (m.statusText ?? '').toLowerCase();
  if (FINISHED_HINTS.some((h) => lower.includes(h))) return 'finished';
  if (m.gameTime > 0) return 'live';
  return 'scheduled';
}
