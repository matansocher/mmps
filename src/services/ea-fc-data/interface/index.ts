import type { Top5LeagueName } from '../ea-fc-data.config';

// Raw row shape (subset) as read from the EA FC 26 CSV. All values are strings.
// Full CSV has ~110 columns; we type only the ones we consume.
export type EaFcRawPlayerRow = {
  readonly player_id: string;
  readonly short_name: string;
  readonly long_name: string;
  readonly player_positions: string; // e.g. "ST, LW, LM"
  readonly overall: string;
  readonly potential: string;
  readonly value_eur: string;
  readonly wage_eur: string;
  readonly age: string;
  readonly dob: string;
  readonly height_cm: string;
  readonly weight_kg: string;
  readonly league_id: string;
  readonly league_name: string;
  readonly club_team_id: string;
  readonly club_name: string;
  readonly club_jersey_number: string;
  readonly nationality_id: string;
  readonly nationality_name: string;
  readonly preferred_foot: string;
  readonly weak_foot: string;
  readonly skill_moves: string;
  readonly international_reputation: string;
  readonly pace: string;
  readonly shooting: string;
  readonly passing: string;
  readonly dribbling: string;
  readonly defending: string;
  readonly physic: string;
  readonly player_face_url: string;
};

// Six main face stats (note dataset spells it "physic").
export type FaceStats = {
  readonly pace: number;
  readonly shooting: number;
  readonly passing: number;
  readonly dribbling: number;
  readonly defending: number;
  readonly physical: number;
};

// Normalized player used by the game (importer output).
export type EaFcPlayer = {
  readonly eaPlayerId: number;
  readonly shortName: string;
  readonly longName: string;
  readonly positions: string[];
  readonly overall: number;
  readonly potential: number;
  readonly valueEur: number;
  readonly wageEur: number;
  readonly age: number;
  readonly dob: string;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly leagueId: number;
  readonly leagueName: Top5LeagueName;
  readonly clubTeamId: number;
  readonly clubName: string;
  readonly jerseyNumber: number | null;
  readonly nationalityId: number;
  readonly nationalityName: string;
  readonly preferredFoot: string;
  readonly weakFoot: number;
  readonly skillMoves: number;
  readonly internationalReputation: number;
  readonly faceStats: FaceStats;
  readonly faceUrl: string;
  readonly logoUrl: string;
  readonly flagUrl: string;
};

// Normalized club aggregated from its players.
export type EaFcTeam = {
  readonly eaTeamId: number;
  readonly name: string;
  readonly leagueId: number;
  readonly leagueName: Top5LeagueName;
  readonly logoUrl: string;
  readonly overall: number; // mean of top-18 players' overall
  readonly playerCount: number;
};

// Normalized league.
export type EaFcLeague = {
  readonly eaLeagueId: number;
  readonly name: Top5LeagueName;
  readonly country: string;
  readonly icon: string;
  readonly teamCount: number;
};

export type EaFcDataset = {
  readonly leagues: EaFcLeague[];
  readonly teams: EaFcTeam[];
  readonly players: EaFcPlayer[];
};
