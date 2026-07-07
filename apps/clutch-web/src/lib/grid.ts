import type { League } from '../types';
import { seasonsForSelection, leagueOf } from './playoffs';
import { selectionMeta } from './leagues';
import { mulberry32, dayNumber } from './daily';

// A single trophy-game appearance: a team that finished as champion or runner-up
// of one tournament in one year. This is the atom every grid cell is checked against.
export type Entry = {
  readonly league: League;
  readonly year: number;
  readonly team: string;
  readonly outcome: 'champion' | 'runnerUp';
};

export type AxisKind = 'league' | 'outcome' | 'decade';

export type Axis = {
  readonly id: string;
  readonly label: string; // short label for the header chip
  readonly emoji: string;
  readonly kind: AxisKind;
  readonly test: (e: Entry) => boolean;
};

export type Cell = {
  readonly row: number;
  readonly col: number;
  readonly validTeams: readonly string[]; // distinct team names that satisfy both axes
  readonly rarity: number; // points awarded for a correct answer (rarer cell → more)
};

export type Grid = {
  readonly rows: readonly Axis[];
  readonly cols: readonly Axis[];
  readonly cells: readonly Cell[]; // 9, row-major
};

// ---- data plumbing -------------------------------------------------------

function localHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

let POOL: Entry[] | null = null;

function entryPool(): Entry[] {
  if (POOL) return POOL;
  const pool: Entry[] = [];
  for (const s of seasonsForSelection('all')) {
    const league = leagueOf(s);
    if (s.champion) pool.push({ league, year: s.season, team: s.champion, outcome: 'champion' });
    if (s.runnerUp) pool.push({ league, year: s.season, team: s.runnerUp, outcome: 'runnerUp' });
  }
  POOL = pool;
  return pool;
}

let TEAM_LEAGUE: Map<string, League> | null = null;

// A representative league per team name — used only to render a logo in the
// search list. Validation always goes through the real entry pool.
function teamLeagueIndex(): Map<string, League> {
  if (TEAM_LEAGUE) return TEAM_LEAGUE;
  const m = new Map<string, League>();
  for (const e of entryPool()) if (!m.has(e.team)) m.set(e.team, e.league);
  TEAM_LEAGUE = m;
  return m;
}

export function allTeams(): readonly { team: string; league: League }[] {
  const idx = teamLeagueIndex();
  return [...idx.entries()].map(([team, league]) => ({ team, league })).sort((a, b) => a.team.localeCompare(b.team));
}

export function leagueForTeam(team: string): League | null {
  return teamLeagueIndex().get(team) ?? null;
}

// ---- axes ----------------------------------------------------------------

function buildAxes(): Axis[] {
  const axes: Axis[] = [];

  const leagues: League[] = ['nba', 'ucl', 'wc', 'euro'];
  for (const lg of leagues) {
    const meta = selectionMeta(lg);
    axes.push({ id: `lg-${lg}`, label: meta.short, emoji: meta.emoji, kind: 'league', test: (e) => e.league === lg });
  }

  axes.push({ id: 'won', label: 'Champion', emoji: '🏆', kind: 'outcome', test: (e) => e.outcome === 'champion' });
  axes.push({ id: 'lost', label: 'Runner-up', emoji: '🥈', kind: 'outcome', test: (e) => e.outcome === 'runnerUp' });

  const years = entryPool().map((e) => e.year);
  const minDec = Math.floor(Math.min(...years) / 10) * 10;
  const maxDec = Math.floor(Math.max(...years) / 10) * 10;
  for (let d = minDec; d <= maxDec; d += 10) {
    const dec = d;
    axes.push({ id: `dec-${dec}`, label: `${String(dec).slice(2)}s`, emoji: '📅', kind: 'decade', test: (e) => Math.floor(e.year / 10) * 10 === dec });
  }

  return axes;
}

// ---- cell validation & scoring ------------------------------------------

function validTeamsFor(row: Axis, col: Axis): string[] {
  const seen = new Set<string>();
  for (const e of entryPool()) {
    if (row.test(e) && col.test(e)) seen.add(e.team);
  }
  return [...seen];
}

function rarityScore(validCount: number): number {
  // Rarer cells (fewer valid teams) are worth more; common cells still reward.
  return 10 + Math.min(60, Math.round(120 / Math.max(1, validCount)));
}

// Does the chosen team satisfy this cell? Returns the matching year for flavour.
export function matchCell(team: string, row: Axis, col: Axis): { year: number; league: League } | null {
  const hits = entryPool().filter((e) => e.team === team && row.test(e) && col.test(e));
  if (hits.length === 0) return null;
  const best = hits.sort((a, b) => a.year - b.year)[0];
  return { year: best.year, league: best.league };
}

// ---- deterministic daily grid -------------------------------------------

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MIN_VALID = 1; // every cell must have at least one valid answer

// Kinds are partitioned across the two axes so no cell ever pairs two
// contradictory constraints (e.g. NBA×UCL, 1990s×2000s, Champion×Runner-up).
type Kind = AxisKind;
const PARTITIONS: readonly { rows: Kind[]; cols: Kind[] }[] = [
  { rows: ['league', 'outcome'], cols: ['decade'] },
  { rows: ['decade'], cols: ['league', 'outcome'] },
  { rows: ['league'], cols: ['outcome', 'decade'] },
  { rows: ['outcome', 'decade'], cols: ['league'] },
];

function pickAxes(pool: Axis[], kinds: Kind[], rng: () => number): Axis[] {
  const candidates = seededShuffle(pool.filter((a) => kinds.includes(a.kind)), rng);
  return candidates.slice(0, 3);
}

export function dailyGrid(date = new Date()): Grid {
  const axes = buildAxes();
  const base = `clutch-grid-v2-${dayNumber(date)}`;

  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry32(localHash(`${base}:${attempt}`));
    const partition = PARTITIONS[Math.floor(rng() * PARTITIONS.length)];
    const rows = pickAxes(axes, partition.rows, rng);
    const cols = pickAxes(axes, partition.cols, rng);
    if (rows.length < 3 || cols.length < 3) continue;

    const cells: Cell[] = [];
    let ok = true;
    for (let r = 0; r < 3 && ok; r++) {
      for (let c = 0; c < 3 && ok; c++) {
        const valid = validTeamsFor(rows[r], cols[c]);
        if (valid.length < MIN_VALID) ok = false;
        else cells.push({ row: r, col: c, validTeams: valid, rarity: rarityScore(valid.length) });
      }
    }
    if (ok && cells.length === 9) return { rows, cols, cells };
  }

  // Fallback: a hand-picked grid guaranteed solvable (leagues × decades).
  const byId = new Map(axes.map((a) => [a.id, a]));
  const rows = [byId.get('lg-nba')!, byId.get('lg-ucl')!, byId.get('won')!];
  const cols = [byId.get('dec-1990')!, byId.get('dec-2000')!, byId.get('dec-2010')!];
  const cells: Cell[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const valid = validTeamsFor(rows[r], cols[c]);
      cells.push({ row: r, col: c, rarity: rarityScore(valid.length), validTeams: valid });
    }
  }
  return { rows, cols, cells };
}

export function cellAt(grid: Grid, row: number, col: number): Cell {
  return grid.cells[row * 3 + col]!;
}
