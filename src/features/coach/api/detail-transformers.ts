import type {
  ScoresAthleteDetails,
  ScoresBracket,
  ScoresCompetitorDetails,
  ScoresGame,
  ScoresGameDetails,
  ScoresGameMember,
  ScoresGameStat,
  ScoresHeadToHead,
  ScoresLineup,
  ScoresSquadAthlete,
  ScoresStandings,
} from '@services/scores-365';
import { classifyGameStatus, getCompetitionName, toGameSummary } from './transformers';
import type {
  DashboardForm,
  DashboardFormEntry,
  DashboardGame,
  FormResult,
  GameDetailResponse,
  GameStatRow,
  GameSummary,
  HeadToHead,
  KnockoutStage,
  LineupPlayer,
  PlayerDetailResponse,
  SquadPlayer,
  StandingsTable,
  TeamDetailResponse,
  TeamLineup,
} from './types';

const HALFTIME_STAGE_ID = 7;
const SUBSTITUTION_EVENT_ID = 1000;
const STARTING_STATUS = 1;
const SUBSTITUTE_STATUS = 2;
const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
const FORM_BY_CODE: Readonly<Record<number, FormResult>> = { 1: 'W', 2: 'D', 0: 'L' };
const MAX_FORM = 5;
const MAX_MEETINGS = 6;
const MAX_RECENT = 5;
// Last-match athlete stats only carry an icon id; names match the lineup stats with the same imageId.
const ATHLETE_GAME_STAT_NAMES: Readonly<Record<number, string>> = { 0: 'Rating', 229: 'Minutes', 226: 'Goals', 225: 'Assists', 222: 'Saves', 233: 'Penalties Saved' };

export function toGameStatRows(stats: readonly ScoresGameStat[] | null, homeId: number, awayId: number): GameStatRow[] {
  const rows = new Map<number, { id: number; name: string; home: string; away: string; isMajor: boolean; order: number }>();
  for (const stat of stats ?? []) {
    const row = rows.get(stat.id) ?? { id: stat.id, name: stat.name, home: '-', away: '-', isMajor: !!stat.isMajor, order: stat.order ?? 999 };
    if (stat.competitorId === homeId) row.home = stat.value;
    if (stat.competitorId === awayId) row.away = stat.value;
    rows.set(stat.id, row);
  }
  return [...rows.values()].sort((a, b) => a.order - b.order).map(({ id, name, home, away, isMajor }) => ({ id, name, home, away, isMajor }));
}

type SubstitutionTimes = { readonly on: ReadonlyMap<number, number>; readonly off: ReadonlyMap<number, number> };

function getSubstitutionTimes(details: ScoresGameDetails): SubstitutionTimes {
  const on = new Map<number, number>();
  const off = new Map<number, number>();
  for (const event of details.events ?? []) {
    if (event.eventType?.id !== SUBSTITUTION_EVENT_ID) continue;
    if (event.playerId) on.set(event.playerId, event.gameTime);
    if (event.extraPlayers?.[0]) off.set(event.extraPlayers[0], event.gameTime);
  }
  return { on, off };
}

function toLineup(lineup: ScoresLineup | undefined, membersById: ReadonlyMap<number, ScoresGameMember>, subs: SubstitutionTimes): TeamLineup | undefined {
  if (!lineup?.members?.length) return undefined;
  const starting: LineupPlayer[] = [];
  const bench: LineupPlayer[] = [];
  const missing: LineupPlayer[] = [];
  let coach: string | undefined;

  for (const member of lineup.members) {
    const info = membersById.get(member.id);
    if (!info) continue;
    if (member.statusText === 'Management') {
      coach = info.name;
      continue;
    }
    const player: LineupPlayer = {
      ...(info.athleteId ? { athleteId: info.athleteId } : {}),
      name: info.name,
      ...(info.shortName ? { shortName: info.shortName } : {}),
      ...(info.jerseyNumber !== undefined ? { jerseyNumber: info.jerseyNumber } : {}),
      ...(member.position?.name ? { position: member.position.name } : {}),
      ...(member.ranking ? { rating: member.ranking } : {}),
      ...(member.yardFormation?.fieldLine !== undefined ? { fieldLine: member.yardFormation.fieldLine } : {}),
      ...(member.yardFormation?.fieldSide !== undefined ? { fieldSide: member.yardFormation.fieldSide } : {}),
      ...(subs.off.has(member.id) ? { subbedOffAt: subs.off.get(member.id) } : {}),
      ...(subs.on.has(member.id) ? { subbedOnAt: subs.on.get(member.id) } : {}),
      stats: (member.stats ?? []).filter((s) => s.isTop).map((s) => ({ name: s.name, value: s.value })),
    };
    if (member.status === STARTING_STATUS) starting.push(player);
    else if (member.status === SUBSTITUTE_STATUS) bench.push(player);
    else missing.push(player);
  }

  // Players who came on are the most relevant part of the bench.
  bench.sort((a, b) => (a.subbedOnAt ?? 999) - (b.subbedOnAt ?? 999));
  return { ...(lineup.status ? { status: lineup.status } : {}), ...(lineup.formation ? { formation: lineup.formation } : {}), starting, bench, missing, ...(coach ? { coach } : {}) };
}

export function toGameDetail(game: DashboardGame, details: ScoresGameDetails | null, stats: readonly ScoresGameStat[] | null): GameDetailResponse {
  if (!details) return { game, hasStandings: false, timeline: game.events, stats: [] };
  const membersById = new Map((details.members ?? []).map((m) => [m.id, m]));
  const subs = getSubstitutionTimes(details);
  const home = toLineup(details.homeCompetitor.lineups, membersById, subs);
  const away = toLineup(details.awayCompetitor.lineups, membersById, subs);
  const halftime = details.stages?.find((s) => s.id === HALFTIME_STAGE_ID && s.isEnded);
  const round = details.roundName ? `${details.roundName}${details.roundNum && !/\d/.test(details.roundName) ? ` ${details.roundNum}` : ''}` : undefined;

  return {
    game,
    ...(details.venue?.name ? { venue: details.venue.name } : {}),
    ...(details.officials?.[0]?.name ? { referee: details.officials[0].name } : {}),
    ...(round ? { round } : {}),
    hasStandings: !!details.hasStandings,
    ...(halftime ? { halftimeScore: [halftime.homeCompetitorScore ?? 0, halftime.awayCompetitorScore ?? 0] as const } : {}),
    timeline: game.events,
    stats: game.status === 'scheduled' ? [] : toGameStatRows(stats, game.home.id, game.away.id),
    ...(home && away ? { lineups: { home, away } } : {}),
  };
}

function toSquadPlayer(athlete: ScoresSquadAthlete): SquadPlayer {
  return {
    athleteId: athlete.id,
    name: athlete.name,
    ...(athlete.jerseyNum !== undefined && athlete.jerseyNum >= 0 ? { jerseyNumber: athlete.jerseyNum } : {}),
    ...(athlete.age ? { age: athlete.age } : {}),
    position: athlete.position?.name || 'Other',
  };
}

type ToTeamDetailInput = {
  readonly team: ScoresCompetitorDetails;
  readonly results: readonly ScoresGame[];
  readonly fixtures: readonly ScoresGame[];
  readonly squad: readonly ScoresSquadAthlete[];
};

export function toTeamDetail({ team, results, fixtures, squad }: ToTeamDetailInput): TeamDetailResponse {
  const recent = [...results].sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 10);
  const upcoming = [...fixtures].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);
  const rank = (position: string) => {
    const index = POSITION_ORDER.indexOf(position);
    return index === -1 ? POSITION_ORDER.length : index;
  };
  // Management/coaching staff come back in the squad without a playing position.
  const players = squad.filter((a) => a.position?.name !== 'Management').map(toSquadPlayer);

  return {
    id: team.id,
    name: team.name,
    ...(team.longName ? { longName: team.longName } : {}),
    ...(team.color ? { color: team.color } : {}),
    ...(team.mainCompetitionId ? { mainCompetitionId: team.mainCompetitionId, mainCompetitionName: getCompetitionName(team.mainCompetitionId) || undefined } : {}),
    recent: recent.map((g) => toGameSummary(g, team.id)),
    upcoming: upcoming.map((g) => toGameSummary(g, team.id)),
    squad: players.sort((a, b) => rank(a.position) - rank(b.position) || (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)),
  };
}

export function toPlayerDetail(athlete: ScoresAthleteDetails): PlayerDetailResponse {
  return {
    id: athlete.id,
    name: athlete.name,
    ...(athlete.position?.name ? { position: athlete.position.name } : {}),
    ...(athlete.jerseyNum !== undefined && athlete.jerseyNum >= 0 ? { jerseyNumber: athlete.jerseyNum } : {}),
    ...(athlete.age ? { age: athlete.age } : {}),
    ...(athlete.nationalityName ? { nationality: athlete.nationalityName } : {}),
    ...(athlete.clubId ? { clubId: athlete.clubId } : {}),
    ...(athlete.contractUntil ? { contractUntil: athlete.contractUntil } : {}),
    ...(athlete.shortBio ? { bio: athlete.shortBio } : {}),
    details: (athlete.playerDetails ?? []).filter((d) => d.title && d.value).map(({ title, value }) => ({ title, value })),
    seasonStats: (athlete.highlightStats ?? [])
      .filter((h) => h.stats?.length)
      .map((h) => ({ competitionName: getCompetitionName(h.competitionId, h.name), stats: h.stats.map(({ name, value }) => ({ name, value })) })),
    recentGames: (athlete.lastMatches?.games ?? []).slice(0, 10).map(({ game, relatedCompetitor, athleteStats }) => ({
      ...toGameSummary(game, relatedCompetitor),
      stats: (athleteStats ?? []).filter((s) => ATHLETE_GAME_STAT_NAMES[s.type] && s.value && s.value !== '-').map((s) => ({ name: ATHLETE_GAME_STAT_NAMES[s.type], value: s.value })),
    })),
  };
}

export function toStandingsTables(standings: ScoresStandings | null): { tables: StandingsTable[]; zones: { name: string; color: string }[] } {
  if (!standings?.rows?.length) return { tables: [], zones: [] };
  const zoneColors = new Map((standings.destinations ?? []).filter((d) => d.color).map((d) => [d.num, d.color]));
  const groupNames = new Map((standings.groups ?? []).map((g) => [g.num, g.name]));
  const byGroup = new Map<number, StandingsTable['rows'][number][]>();

  for (const row of standings.rows) {
    const group = row.groupNum ?? 0;
    const zoneColor = row.destinationNum ? zoneColors.get(row.destinationNum) : undefined;
    const rows = byGroup.get(group) ?? [];
    rows.push({
      position: row.position ?? rows.length + 1,
      team: { id: row.competitor.id, name: row.competitor.name },
      played: row.gamePlayed ?? 0,
      won: row.gamesWon ?? 0,
      drawn: row.gamesEven ?? 0,
      lost: row.gamesLost ?? 0,
      goalsFor: row.for ?? 0,
      goalsAgainst: row.against ?? 0,
      points: row.points,
      form: (row.recentForm ?? [])
        .slice(0, MAX_FORM)
        .map((code) => FORM_BY_CODE[code])
        .filter(Boolean)
        .reverse(),
      ...(zoneColor ? { zoneColor } : {}),
      isLive: !!row.liveGameId && row.liveGameId > 0,
      ...(row.liveGameId && row.liveGameId > 0 ? { liveGameId: row.liveGameId } : {}),
      trend: Math.sign(row.trend ?? 0),
    });
    byGroup.set(group, rows);
  }

  const tables = [...byGroup.entries()]
    .sort(([a], [b]) => a - b)
    .map(([group, rows]) => ({ ...(groupNames.get(group) ? { name: groupNames.get(group) } : {}), rows: rows.sort((a, b) => a.position - b.position) }));
  const usedZones = new Set(standings.rows.map((r) => r.destinationNum));
  const zones = (standings.destinations ?? []).filter((d) => d.color && usedZones.has(d.num)).map((d) => ({ name: d.name, color: d.color }));
  return { tables, zones };
}

export function toKnockoutStages(brackets: readonly ScoresBracket[]): KnockoutStage[] {
  const stages: KnockoutStage[] = [];
  for (const bracket of brackets) {
    for (const stage of bracket.stages ?? []) {
      // Stages with standings are group phases, already covered by the tables.
      if (stage.hasStandings || !stage.groups?.length) continue;
      const matchups = stage.groups
        .filter((g) => g.participants?.length)
        .map((group) => ({
          teams: group.participants.map((p) => ({ id: p.competitorId, name: p.name, isQualified: !!p.isQualified })),
          ...(group.score?.length === 2 && group.score.every((n) => n >= 0) ? { aggregate: [group.score[0], group.score[1]] as const } : {}),
          legs: (group.games ?? []).map(({ gameId, game }) => {
            const status = classifyGameStatus(game?.statusGroup ?? 2);
            const hasScore = status !== 'scheduled' && (game?.homeCompetitor?.score ?? -1) >= 0;
            return {
              gameId,
              ...(game?.startTime ? { startTime: game.startTime } : {}),
              status,
              ...(game?.homeCompetitor?.id ? { homeId: game.homeCompetitor.id } : {}),
              ...(hasScore ? { homeScore: game.homeCompetitor.score, awayScore: game.awayCompetitor?.score } : {}),
            };
          }),
        }));
      if (matchups.length) stages.push({ name: stage.name, matchups });
    }
  }
  return stages;
}

function toFormEntries(games: readonly GameSummary[], teamId: number): DashboardFormEntry[] {
  return games
    .filter((g) => g.result)
    .map((g) => {
      const isHome = g.home.id === teamId;
      const [own, opponent] = isHome ? [g.home, g.away] : [g.away, g.home];
      return { result: g.result, opponent: opponent.shortName || opponent.name, score: `${own.score}-${opponent.score}` };
    })
    .reverse();
}

export function toDashboardForm(headToHead: HeadToHead | null, homeId: number, awayId: number): DashboardForm | undefined {
  if (!headToHead) return undefined;
  const form = { home: toFormEntries(headToHead.homeRecent, homeId), away: toFormEntries(headToHead.awayRecent, awayId) };
  return form.home.length || form.away.length ? form : undefined;
}

export function toHeadToHead(h2h: ScoresHeadToHead | null): HeadToHead | undefined {
  if (!h2h) return undefined;
  const finishedSummaries = (games: readonly ScoresGame[] | undefined, teamId: number): GameSummary[] =>
    (games ?? []).filter((g) => g.id !== h2h.id && classifyGameStatus(g.statusGroup) === 'finished').map((g) => toGameSummary(g, teamId));

  const meetings = finishedSummaries(h2h.h2hGames, h2h.homeCompetitor.id);
  const homeRecent = finishedSummaries(h2h.homeCompetitor.recentGames, h2h.homeCompetitor.id).slice(0, MAX_RECENT);
  const awayRecent = finishedSummaries(h2h.awayCompetitor.recentGames, h2h.awayCompetitor.id).slice(0, MAX_RECENT);
  if (!meetings.length && !homeRecent.length && !awayRecent.length) return undefined;

  const count = (result: FormResult) => meetings.filter((m) => m.result === result).length;
  return {
    record: { homeWins: count('W'), draws: count('D'), awayWins: count('L') },
    meetings: meetings.slice(0, MAX_MEETINGS),
    homeRecent,
    awayRecent,
  };
}
