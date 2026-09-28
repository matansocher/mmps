import { getFavorites } from './favorites';
import { GAMES, getGame } from './games';
import { getHistory, getTodayPlayCount } from './history';
import { DAILY_GOAL, localDay, readJson, removeJson, seededRandom, writeJson } from './progress';

export type DailySession = { readonly day: string; readonly games: string[] };
export function getAvoided(): string[] {
  return readJson('mindloop:less-like', []);
}
export function avoidGame(id: string): void {
  writeJson('mindloop:less-like', [...new Set([...getAvoided(), id])]);
  removeJson('mindloop:session');
  window.dispatchEvent(new Event('mindloop:data'));
}
export function restoreRecommendations(): void {
  writeJson('mindloop:less-like', []);
  removeJson('mindloop:session');
  window.dispatchEvent(new Event('mindloop:data'));
}
export function dailySession(): DailySession {
  const day = localDay();
  const stored = readJson<DailySession | null>('mindloop:session', null);
  if (stored?.day === day && stored.games.every((id) => getGame(id))) return stored;
  const avoided = getAvoided();
  const total = getHistory().filter((r) => r.gameId !== 'warm-up').length;
  const welcoming = ['grid-recall', 'odd-one-out', 'quick-math'];
  const candidates = GAMES.filter((g) => !avoided.includes(g.id) && (total >= 3 || welcoming.includes(g.id)));
  const pool = candidates.length >= 3 ? candidates : GAMES;
  const random = seededRandom(day);
  const history = getHistory();
  const favorites = getFavorites().filter((id) => pool.some((g) => g.id === id));
  const familiar = favorites[0] ?? history.find((run) => pool.some((g) => g.id === run.gameId))?.gameId ?? (pool.some((g) => g.id === 'grid-recall') ? 'grid-recall' : pool[0].id);
  const others = pool
    .filter((g) => g.id !== familiar)
    .sort((a, b) => {
      const ac = history.filter((r) => r.gameId === a.id).length,
        bc = history.filter((r) => r.gameId === b.id).length;
      return ac - bc;
    });
  const next = others[0].id;
  const last = others.filter((g) => g.id !== next && g.category !== getGame(next)?.category);
  const games = [familiar, next, last[Math.floor(random() * last.length)]?.id ?? others[1].id];
  const session = { day, games };
  writeJson('mindloop:session', session);
  return session;
}
export function nextSessionGame(): string {
  return dailySession().games[Math.min(DAILY_GOAL - 1, getTodayPlayCount())];
}
export function gameUrl(id: string, mode = 'classic', extra = ''): string {
  return `/game/${id}?mode=${mode}${extra}`;
}
export function dailyChallengeDay(): string {
  return new Date().toISOString().slice(0, 10);
}
export function validChallengeDay(day: string | null): string {
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day ? day : dailyChallengeDay();
}
