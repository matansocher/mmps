import { COMPETITIONS } from '@services/scores-365';
import type { ScoresCompetitorRef, ScoresGame, ScoresGameDetails, ScoresGameEvent, ScoresGameStat } from '@services/scores-365';
import type { DashboardEventType } from '@shared/coach';
import { MAX_FEED_ITEMS } from './constants';
import type { DashboardEvent, DashboardFeedItem, DashboardGame, DashboardGameStatus, DashboardStatPair, DashboardStats, DashboardTeam } from './types';

const EVENT_TYPE_BY_ID: Record<number, DashboardEventType> = {
  1: 'goal',
  2: 'yellowCard',
  3: 'redCard',
  6: 'missedPenalty',
  11: 'var',
  12: 'woodwork',
  1000: 'substitution',
};

const STAT_IDS = {
  POSSESSION: 10,
  EXPECTED_GOALS: 76,
  SHOTS_ON_TARGET: 4,
};

const STATUS_RANK: Record<DashboardGameStatus, number> = { live: 0, scheduled: 1, other: 2, finished: 3 };

const COMPETITION_ORDER = new Map(COMPETITIONS.map((c, index) => [c.id, index]));

export function classifyGameStatus(statusGroup: number): DashboardGameStatus {
  if (statusGroup === 2) return 'scheduled';
  if (statusGroup === 3) return 'live';
  if (statusGroup === 4) return 'finished';
  return 'other';
}

export function mapEventType(event: ScoresGameEvent): DashboardEventType | null {
  const id = event.eventType?.id;
  if (id !== undefined && EVENT_TYPE_BY_ID[id]) return EVENT_TYPE_BY_ID[id];
  const name = `${event.eventType?.name ?? ''} ${event.eventType?.subTypeName ?? ''}`.toLowerCase();
  if (name.includes('var')) return 'var';
  if (name.includes('אדום') || name.includes('red')) return 'redCard';
  return null;
}

function toTeam(competitor: ScoresCompetitorRef, status: DashboardGameStatus): DashboardTeam {
  const hasScore = status !== 'scheduled' && typeof competitor.score === 'number' && competitor.score >= 0;
  return {
    id: competitor.id,
    name: competitor.name,
    ...(competitor.shortName ? { shortName: competitor.shortName } : {}),
    score: hasScore ? competitor.score : null,
  };
}

export function toDashboardEvents(details: ScoresGameDetails | null): DashboardEvent[] {
  if (!details?.events?.length) return [];
  const members = new Map((details.members ?? []).map((m) => [m.id, m]));
  const homeId = details.homeCompetitor.id;
  const events: DashboardEvent[] = [];
  details.events.forEach((event, index) => {
    const type = mapEventType(event);
    if (!type) return;
    const player = event.playerId ? members.get(event.playerId) : undefined;
    const extra = event.extraPlayers?.[0] ? members.get(event.extraPlayers[0]) : undefined;
    const detail = event.eventType?.subTypeName;
    events.push({
      key: `${details.id}:${event.order ?? index}:${event.eventType?.id ?? 0}`,
      gameId: details.id,
      type,
      minute: (event.gameTime ?? 0) + (event.addedTime ?? 0),
      minuteDisplay: event.gameTimeDisplay || `${Math.round(event.gameTime ?? 0)}'`,
      side: event.competitorId === homeId ? 'home' : 'away',
      ...(player ? { playerName: player.shortName || player.name } : {}),
      ...(extra ? { assistName: extra.shortName || extra.name } : {}),
      ...(detail && type !== 'var' ? { detail } : {}),
      ...(type === 'var' ? { detail: event.eventType?.name } : {}),
    });
  });
  return events;
}

function statPair(stats: readonly ScoresGameStat[], statId: number, homeId: number, awayId: number): DashboardStatPair | undefined {
  const home = stats.find((s) => s.id === statId && s.competitorId === homeId);
  const away = stats.find((s) => s.id === statId && s.competitorId === awayId);
  if (!home && !away) return undefined;
  return [home?.value ?? '0', away?.value ?? '0'];
}

export function toDashboardStats(stats: readonly ScoresGameStat[] | null, homeId: number, awayId: number): DashboardStats | undefined {
  if (!stats?.length) return undefined;
  const possession = statPair(stats, STAT_IDS.POSSESSION, homeId, awayId);
  const expectedGoals = statPair(stats, STAT_IDS.EXPECTED_GOALS, homeId, awayId);
  const shotsOnTarget = statPair(stats, STAT_IDS.SHOTS_ON_TARGET, homeId, awayId);
  if (!possession && !expectedGoals && !shotsOnTarget) return undefined;
  return {
    ...(possession ? { possession } : {}),
    ...(expectedGoals ? { expectedGoals } : {}),
    ...(shotsOnTarget ? { shotsOnTarget } : {}),
  };
}

export type ToDashboardGameInput = {
  readonly game: ScoresGame;
  readonly details: ScoresGameDetails | null;
  readonly stats: readonly ScoresGameStat[] | null;
  readonly favoriteTeamIds: ReadonlySet<number>;
  readonly competitionNames: ReadonlyMap<number, string>;
};

export function toDashboardGame({ game, details, stats, favoriteTeamIds, competitionNames }: ToDashboardGameInput): DashboardGame {
  // The /game details response is fresher than the list response, so prefer it when present.
  const source = details ?? game;
  const status = classifyGameStatus(source.statusGroup);
  const home = toTeam(source.homeCompetitor, status);
  const away = toTeam(source.awayCompetitor, status);
  const gameStats = status === 'live' ? toDashboardStats(stats, home.id, away.id) : undefined;
  return {
    id: game.id,
    competitionId: game.competitionId,
    competitionName: competitionNames.get(game.competitionId) || game.competitionDisplayName || '',
    startTime: game.startTime,
    status,
    statusText: source.shortStatusText || source.statusText || '',
    ...(status === 'live' && source.gameTimeDisplay ? { minuteDisplay: source.gameTimeDisplay } : {}),
    home,
    away,
    isFavorite: favoriteTeamIds.has(home.id) || favoriteTeamIds.has(away.id),
    events: toDashboardEvents(details),
    ...(gameStats ? { stats: gameStats } : {}),
  };
}

export function sortDashboardGames(games: readonly DashboardGame[]): DashboardGame[] {
  return [...games].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus) return byStatus;
    const byTime = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    if (byTime) return a.status === 'finished' ? -byTime : byTime;
    const byCompetition = (COMPETITION_ORDER.get(a.competitionId) ?? 999) - (COMPETITION_ORDER.get(b.competitionId) ?? 999);
    if (byCompetition) return byCompetition;
    return a.id - b.id;
  });
}

// Events only carry the match minute, so wall-clock time is estimated from kickoff plus breaks (half-time, before extra time).
export function estimateEventTime(startTime: string, minute: number, minuteDisplay?: string): Date {
  // Stoppage time keeps the period's base minute in the display ("45+8'"), so breaks are decided by it, not by the raw minute.
  const periodMinute = parseInt(minuteDisplay ?? '', 10) || minute;
  let elapsed = minute;
  if (periodMinute > 45) elapsed += 15;
  if (periodMinute > 90) elapsed += 5;
  if (periodMinute > 120) elapsed += 5;
  return new Date(new Date(startTime).getTime() + elapsed * 60_000);
}

export function buildFeed(games: readonly DashboardGame[]): DashboardFeedItem[] {
  const items: DashboardFeedItem[] = [];
  for (const game of games) {
    for (const event of game.events) {
      items.push({
        ...event,
        competitionId: game.competitionId,
        competitionName: game.competitionName,
        home: game.home,
        away: game.away,
        gameStatus: game.status,
        estimatedAt: estimateEventTime(game.startTime, event.minute, event.minuteDisplay).toISOString(),
      });
    }
  }
  // ISO timestamps sort lexicographically in chronological order.
  items.sort((a, b) => b.estimatedAt.localeCompare(a.estimatedAt) || b.minute - a.minute);
  return items.slice(0, MAX_FEED_ITEMS);
}
