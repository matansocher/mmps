import type { ScoresGame, ScoresStandings, ScoresStandingsRow } from '@services/scores-365';
import type { GameHeadline, GameHeadlineType } from './types';

const RELEGATION_TYPE = 3;
const NEGATIVE_ZONE_TYPES = new Set([RELEGATION_TYPE, 5]);

const PRIORITY: Readonly<Record<GameHeadlineType, number>> = {
  champions: 10,
  relegated: 9,
  qualified: 8,
  top: 7,
  zoneIn: 6,
  lostTop: 5,
  dangerIn: 4,
  dangerOut: 3,
  zoneOut: 2,
  moveUp: 1,
};

const MIN_CLIMB = 2;

type TableRow = { readonly id: number; readonly points: number; readonly goalDiff: number; readonly goalsFor: number; readonly played: number };
type Candidate = GameHeadline & { readonly climb: number };

function toTableRow(row: ScoresStandingsRow): TableRow {
  const goalsFor = row.for ?? 0;
  return { id: row.competitor.id, points: row.points, goalDiff: goalsFor - (row.against ?? 0), goalsFor, played: row.gamePlayed ?? 0 };
}

function isAbove(a: TableRow, b: TableRow): boolean {
  if (a.points !== b.points) return a.points > b.points;
  if (a.goalDiff !== b.goalDiff) return a.goalDiff > b.goalDiff;
  return a.goalsFor > b.goalsFor;
}

function withoutResult(row: TableRow, scored: number, conceded: number): TableRow {
  const points = scored > conceded ? 3 : scored === conceded ? 1 : 0;
  return { id: row.id, points: row.points - points, goalDiff: row.goalDiff - scored + conceded, goalsFor: row.goalsFor - scored, played: row.played - 1 };
}

// Rebuilds the order before this game: the other teams keep the table's order (which may use head-to-head tie-breaks) and the two teams are re-inserted.
function tableBefore(after: readonly TableRow[], reverted: readonly TableRow[]): TableRow[] {
  const ids = new Set(reverted.map((r) => r.id));
  const table = after.filter((r) => !ids.has(r.id));
  for (const row of reverted) {
    const index = table.findIndex((other) => isAbove(row, other));
    table.splice(index === -1 ? table.length : index, 0, row);
  }
  return table;
}

function maxPoints(row: TableRow, seasonGames: number): number {
  return row.points + 3 * Math.max(0, seasonGames - row.played);
}

function isChampion(table: readonly TableRow[], id: number, seasonGames: number): boolean {
  const team = table.find((r) => r.id === id);
  return !!team && table.every((other) => other.id === id || maxPoints(other, seasonGames) < team.points);
}

function isRelegated(table: readonly TableRow[], id: number, seasonGames: number, safePlaces: number): boolean {
  const team = table.find((r) => r.id === id);
  if (!team) return false;
  const best = maxPoints(team, seasonGames);
  return table.filter((other) => other.id !== id && other.points > best).length >= safePlaces;
}

export function getGameHeadline(game: Pick<ScoresGame, 'id' | 'homeCompetitor' | 'awayCompetitor'>, standings: ScoresStandings | null, seasonGames?: number): GameHeadline | undefined {
  const qualified = [game.homeCompetitor, game.awayCompetitor].find((c) => c.isQualified);
  if (qualified) return { type: 'qualified', teamId: qualified.id };

  const homeScore = game.homeCompetitor.score ?? -1;
  const awayScore = game.awayCompetitor.score ?? -1;
  if (!standings || homeScore < 0 || awayScore < 0) return undefined;

  const homeRow = standings.rows.find((r) => r.competitor.id === game.homeCompetitor.id);
  const awayRow = standings.rows.find((r) => r.competitor.id === game.awayCompetitor.id);
  if (!homeRow || !awayRow || (homeRow.groupNum ?? null) !== (awayRow.groupNum ?? null)) return undefined;
  // Only trust the table once it already counts this game.
  if (homeRow.detailedRecentForm?.[0]?.id !== game.id || awayRow.detailedRecentForm?.[0]?.id !== game.id) return undefined;

  const groupRows = standings.rows.filter((r) => (r.groupNum ?? null) === (homeRow.groupNum ?? null)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const after = groupRows.map(toTableRow);
  const before = tableBefore(after, [withoutResult(toTableRow(homeRow), homeScore, awayScore), withoutResult(toTableRow(awayRow), awayScore, homeScore)]);

  const zones = new Map((standings.destinations ?? []).map((d) => [d.num, { name: d.name.trim(), negative: NEGATIVE_ZONE_TYPES.has(d.type ?? 0), relegation: d.type === RELEGATION_TYPE }]));
  const zoneAt = (position: number) => zones.get(groupRows[position - 1]?.destinationNum ?? 0);
  const firstRelegated = groupRows.findIndex((r) => zones.get(r.destinationNum ?? 0)?.relegation);

  const candidates: Candidate[] = [];
  for (const id of [game.homeCompetitor.id, game.awayCompetitor.id]) {
    const from = before.findIndex((r) => r.id === id) + 1;
    const to = after.findIndex((r) => r.id === id) + 1;
    const climb = from - to;
    const add = (type: GameHeadlineType, extra: Partial<GameHeadline> = {}) => candidates.push({ type, teamId: id, climb, ...extra });

    if (seasonGames && isChampion(after, id, seasonGames) && !isChampion(before, id, seasonGames)) add('champions');
    if (seasonGames && firstRelegated > 0 && isRelegated(after, id, seasonGames, firstRelegated) && !isRelegated(before, id, seasonGames, firstRelegated)) add('relegated');
    if (to === 1 && from !== 1) add('top');
    if (from === 1 && to !== 1) add('lostTop');

    const zoneFrom = zoneAt(from);
    const zoneTo = zoneAt(to);
    if (zoneFrom !== zoneTo) {
      if (climb > 0 && zoneTo && !zoneTo.negative) add('zoneIn', { zone: zoneTo.name });
      else if (climb > 0 && zoneFrom?.negative) add('dangerOut', { zone: zoneFrom.name });
      else if (climb < 0 && zoneTo?.negative) add('dangerIn', { zone: zoneTo.name });
      else if (climb < 0 && zoneFrom && !zoneFrom.negative) add('zoneOut', { zone: zoneFrom.name });
    }
    if (climb >= MIN_CLIMB) add('moveUp', { position: to });
  }

  const [best] = candidates.sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type] || b.climb - a.climb);
  if (!best) return undefined;
  return { type: best.type, teamId: best.teamId, ...(best.position ? { position: best.position } : {}), ...(best.zone ? { zone: best.zone } : {}) };
}
