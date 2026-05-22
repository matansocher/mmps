import { COMPETITION_IDS_MAP } from '@services/scores-365';

const WORLD_CUP_ID = COMPETITION_IDS_MAP.WORLD_CUP;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const BASE = 'https://webws.365scores.com/web';
const PARAMS = new URLSearchParams({
  appTypeId: '5',
  langId: '2',
  timezoneName: 'Asia/Jerusalem',
  userCountryId: '6',
});

export type StandingsRow = {
  readonly competitorId: number;
  readonly name: string;
  readonly imageVersion: number;
  readonly groupNum: number;
  readonly position: number;
  readonly gamePlayed: number;
  readonly gamesWon: number;
  readonly gamesEven: number;
  readonly gamesLost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDiff: number;
  readonly points: number;
};

export type GroupStandings = {
  readonly num: number;
  readonly name: string;
  readonly rows: StandingsRow[];
};

let cached: { data: GroupStandings[]; ts: number } | null = null;

export async function getWorldCupStandings(): Promise<GroupStandings[]> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const url = `${BASE}/standings/?${PARAMS}&competitions=${WORLD_CUP_ID}&live=false&withSeasonsFilter=true`;
  const res = await fetch(url);
  if (!res.ok) return cached?.data ?? [];

  const json: any = await res.json();
  const standing = json.standings?.[0];
  if (!standing) return cached?.data ?? [];

  const groups: Record<number, { name: string; rows: StandingsRow[] }> = {};

  for (const g of standing.groups ?? []) {
    groups[g.num] = { name: g.name, rows: [] };
  }

  for (const row of standing.rows ?? []) {
    const gn = row.groupNum;
    if (!groups[gn]) groups[gn] = { name: `Group ${gn}`, rows: [] };

    groups[gn].rows.push({
      competitorId: row.competitor.id,
      name: row.competitor.name,
      imageVersion: row.competitor.imageVersion ?? 1,
      groupNum: gn,
      position: row.position,
      gamePlayed: row.gamePlayed,
      gamesWon: row.gamesWon,
      gamesEven: row.gamesEven,
      gamesLost: row.gamesLost,
      goalsFor: row.for,
      goalsAgainst: row.against,
      goalDiff: row.for - row.against,
      points: row.points,
    });
  }

  const result: GroupStandings[] = Object.entries(groups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([num, g]) => ({
      num: Number(num),
      name: g.name,
      rows: g.rows.sort((a, b) => a.position - b.position),
    }));

  cached = { data: result, ts: Date.now() };
  return result;
}
