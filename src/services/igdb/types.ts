export type ReleaseStatus = 'upcoming' | 'tba' | 'released';

export type GameReleaseInfo = {
  readonly date: Date | null; // null when the date is fuzzy ("Q4 2026") or TBA
  readonly human: string; // display string: "Sep 15, 2026" | "Q4 2026" | "TBA"
  readonly status: ReleaseStatus;
};

export type IgdbGame = {
  readonly id: number;
  readonly name: string;
  readonly slug: string | null;
  readonly coverUrl: string | null;
  readonly psStoreProductId: string | null; // PlayStation Store product id, when IGDB has the mapping
  readonly psStoreUrl: string | null; // PlayStation Store page url, a fallback when the product id mapping is missing
  readonly release: GameReleaseInfo;
};

export type IgdbReleaseDateResponse = {
  readonly date?: number; // unix seconds
  readonly human?: string;
  readonly status?: number;
  readonly platform?: number;
  readonly region?: number;
  readonly y?: number;
  readonly m?: number;
};

export type IgdbExternalGameResponse = {
  readonly category?: number;
  readonly uid?: string;
  readonly url?: string;
};

export type IgdbGameResponse = {
  readonly id: number;
  readonly name: string;
  readonly slug?: string;
  readonly cover?: { readonly image_id?: string };
  readonly release_dates?: readonly IgdbReleaseDateResponse[];
  readonly external_games?: readonly IgdbExternalGameResponse[];
};

export type TwitchTokenResponse = {
  readonly access_token: string;
  readonly expires_in: number;
};
