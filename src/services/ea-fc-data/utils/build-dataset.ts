import { EA_FC_DATASET_URL, TOP_5_LEAGUE_ID_TO_NAME, TOP_5_LEAGUES, type Top5LeagueName } from '../ea-fc-data.config';
import type { EaFcDataset, EaFcLeague, EaFcPlayer, EaFcRawPlayerRow, EaFcTeam } from '../interface';
import { buildFlagUrl, buildPlayerFaceUrl, buildTeamLogoUrl } from './image-url';
import { parseCsv } from './parse-csv';

// Dataset stores numbers as float strings ("243.0", "97.0"); coerce safely.
function toInt(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toIntOrNull(value: string): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function mapRow(row: EaFcRawPlayerRow): EaFcPlayer | null {
  // Filter on the unique numeric league_id (league_name is ambiguous — see config).
  const leagueId = toInt(row.league_id);
  const leagueName = TOP_5_LEAGUE_ID_TO_NAME.get(leagueId);
  if (!leagueName) return null;

  const eaPlayerId = toInt(row.player_id);
  const clubTeamId = toInt(row.club_team_id);
  const nationalityId = toInt(row.nationality_id);

  return {
    eaPlayerId,
    shortName: row.short_name,
    longName: row.long_name,
    positions: row.player_positions
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean),
    overall: toInt(row.overall),
    potential: toInt(row.potential),
    valueEur: toInt(row.value_eur),
    wageEur: toInt(row.wage_eur),
    age: toInt(row.age),
    dob: row.dob,
    heightCm: toInt(row.height_cm),
    weightKg: toInt(row.weight_kg),
    leagueId,
    leagueName,
    clubTeamId,
    clubName: row.club_name,
    jerseyNumber: toIntOrNull(row.club_jersey_number),
    nationalityId,
    nationalityName: row.nationality_name,
    preferredFoot: row.preferred_foot,
    weakFoot: toInt(row.weak_foot),
    skillMoves: toInt(row.skill_moves),
    internationalReputation: toInt(row.international_reputation),
    faceStats: {
      pace: toInt(row.pace),
      shooting: toInt(row.shooting),
      passing: toInt(row.passing),
      dribbling: toInt(row.dribbling),
      defending: toInt(row.defending),
      physical: toInt(row.physic),
    },
    faceUrl: row.player_face_url || buildPlayerFaceUrl(eaPlayerId),
    logoUrl: buildTeamLogoUrl(clubTeamId),
    flagUrl: buildFlagUrl(nationalityId),
  };
}

// Mean overall of a club's best `topN` players — a simple club strength rating.
function clubOverall(players: EaFcPlayer[], topN = 18): number {
  const sorted = [...players].sort((a, b) => b.overall - a.overall).slice(0, topN);
  if (sorted.length === 0) return 0;
  const sum = sorted.reduce((acc, p) => acc + p.overall, 0);
  return Math.round(sum / sorted.length);
}

// Transform raw CSV rows into the normalized dataset (top-5 leagues only).
export function buildDataset(rows: EaFcRawPlayerRow[]): EaFcDataset {
  const players = rows.map(mapRow).filter((p): p is EaFcPlayer => p !== null);

  const teamMap = new Map<number, EaFcPlayer[]>();
  for (const player of players) {
    const list = teamMap.get(player.clubTeamId);
    if (list) list.push(player);
    else teamMap.set(player.clubTeamId, [player]);
  }

  const teams: EaFcTeam[] = [...teamMap.entries()].map(([eaTeamId, teamPlayers]) => {
    const sample = teamPlayers[0];
    return {
      eaTeamId,
      name: sample.clubName,
      leagueId: sample.leagueId,
      leagueName: sample.leagueName,
      logoUrl: buildTeamLogoUrl(eaTeamId),
      overall: clubOverall(teamPlayers),
      playerCount: teamPlayers.length,
    };
  });

  const leagues: EaFcLeague[] = (Object.keys(TOP_5_LEAGUES) as Top5LeagueName[]).map((name) => {
    const meta = TOP_5_LEAGUES[name];
    return {
      eaLeagueId: meta.leagueId,
      name,
      country: meta.country,
      icon: meta.icon,
      teamCount: teams.filter((t) => t.leagueName === name).length,
    };
  });

  return { leagues, teams, players };
}

// Fetch the raw CSV text from the public GitHub mirror.
export async function fetchDatasetCsv(url: string = EA_FC_DATASET_URL): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch EA FC dataset: ${response.status} ${response.statusText}`);
  return response.text();
}

// Convenience: fetch + parse + normalize in one call.
export async function loadEaFcDataset(url?: string): Promise<EaFcDataset> {
  const csv = await fetchDatasetCsv(url);
  const rows = parseCsv(csv) as unknown as EaFcRawPlayerRow[];
  return buildDataset(rows);
}
