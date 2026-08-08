import { ANON_KEY, BASE_URL } from './constants';
import type { RumourClub, RumourSource, TransferRumour } from './types';

// Raw row shape from the app_rumour table (only the parts we read).
type RawRumourRow = {
  readonly id: string;
  readonly status: string;
  readonly probability: number | null;
  readonly confidence: string | null;
  readonly reported_at: string;
  readonly days_ago: number | null;
  readonly data: RawRumourData;
};

type RawRumourClub = { name?: string | null; league?: string | null; leagueId?: number | null } | null;

type RawRumourData = {
  readonly type?: string | null;
  readonly summary?: string | null;
  readonly gateSummary?: string | null;
  readonly probabilityBand?: string | null;
  readonly prominence?: number | null;
  readonly tmValue?: number | null;
  readonly feeLabel?: string | null;
  readonly sourceUrl?: string | null;
  readonly player?: { name?: string | null; age?: number | null; nationality?: string | null; posName?: string | null } | null;
  readonly fromClub?: RawRumourClub;
  readonly toClub?: RawRumourClub;
  readonly primarySource?: { name?: string | null; handle?: string | null; cred?: number | null; type?: string | null } | null;
};

const SELECT = 'id,status,probability,confidence,reported_at,days_ago,data';

type GetLiveRumoursOptions = {
  readonly sinceIso?: string | null; // only rumours reported strictly after this ISO timestamp
  readonly limit?: number;
};

// Fetches currently-live rumours ordered oldest-first, optionally only those reported since `sinceIso`.
export async function getLiveRumours(options: GetLiveRumoursOptions = {}): Promise<TransferRumour[]> {
  const { sinceIso, limit = 1000 } = options;
  const params = new URLSearchParams({ is_live: 'eq.true', order: 'reported_at.asc', limit: String(limit), select: SELECT });
  if (sinceIso) {
    params.set('reported_at', `gt.${sinceIso}`);
  }

  const url = `${BASE_URL}/app_rumour?${params.toString()}`;
  const response = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  if (!response.ok) {
    throw new Error(`Failed to fetch transfer rumours: ${response.status}`);
  }

  const rows = (await response.json()) as RawRumourRow[];
  return rows.map(toTransferRumour);
}

function toClub(raw: RawRumourClub): RumourClub | null {
  if (!raw || (!raw.name && raw.leagueId == null)) {
    return null;
  }
  return { name: raw.name ?? null, league: raw.league ?? null, leagueId: raw.leagueId ?? null };
}

function toSource(raw: RawRumourData['primarySource']): RumourSource | null {
  if (!raw || !raw.name) {
    return null;
  }
  return { name: raw.name, handle: raw.handle ?? null, cred: raw.cred ?? null, type: raw.type ?? null };
}

function toTransferRumour(row: RawRumourRow): TransferRumour {
  const data = row.data ?? {};
  const player = data.player ?? {};
  return {
    id: row.id,
    status: row.status,
    type: data.type ?? null,
    probability: row.probability ?? 0,
    confidence: row.confidence ?? null,
    probabilityBand: data.probabilityBand ?? null,
    reportedAt: row.reported_at,
    daysAgo: row.days_ago ?? null,
    summary: data.summary ?? null,
    gateSummary: data.gateSummary ?? null,
    playerName: player.name ?? null,
    playerAge: player.age ?? null,
    playerNationality: player.nationality ?? null,
    playerPosition: player.posName ?? null,
    prominence: data.prominence ?? 0,
    marketValueEur: data.tmValue ?? null,
    feeLabel: data.feeLabel ?? null,
    fromClub: toClub(data.fromClub ?? null),
    toClub: toClub(data.toClub ?? null),
    primarySource: toSource(data.primarySource),
    sourceUrl: data.sourceUrl ?? null,
  };
}
