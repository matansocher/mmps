// A club at one end of a rumoured move.
export type RumourClub = {
  readonly name: string | null;
  readonly league: string | null;
  readonly leagueId: number | null;
};

// A reporter/source credited with a rumour.
export type RumourSource = {
  readonly name: string | null;
  readonly handle: string | null;
  readonly cred: number | null; // credibility score (0-100)
  readonly type: string | null; // e.g. "Journalist"
};

// A single transfer rumour, flattened from app_rumour (top-level columns + the fields
// we care about out of the nested `data` blob) into a shape that is easy to work with.
export type TransferRumour = {
  readonly id: string; // stable slug, e.g. "rodri-to-barcelona"
  readonly status: string; // rumour | imminent | agreed | confirmed | collapsed
  readonly type: string | null; // "Transfer" | "Loan" | "Here we go" | "Renewal"
  readonly probability: number; // 0-100
  readonly confidence: string | null; // low | medium | high
  readonly probabilityBand: string | null; // e.g. "VERY LIKELY"
  readonly reportedAt: string; // ISO timestamp of the latest report
  readonly daysAgo: number | null;
  readonly summary: string | null; // one-line human summary
  readonly gateSummary: string | null; // deal-stage narrative
  readonly playerName: string | null;
  readonly playerAge: number | null;
  readonly playerNationality: string | null;
  readonly playerPosition: string | null; // posName, e.g. "Centre-Back"
  readonly prominence: number; // 0-92, player caliber + media attention
  readonly marketValueEur: number | null; // tmValue
  readonly feeLabel: string | null; // e.g. "£5.1m-£6.9m"
  readonly fromClub: RumourClub | null;
  readonly toClub: RumourClub | null;
  readonly primarySource: RumourSource | null;
  readonly sourceUrl: string | null; // link to the original report
};
