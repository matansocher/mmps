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
  readonly date?: number; // unix seconds — only an exact day when `category` is the full-date format
  readonly human?: string;
  readonly status?: number;
  readonly category?: number; // date format precision (0 = full date, 1 = month, 2 = year, 3-6 = quarter, 7 = TBD)
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

export type IgdbRatedGame = {
  readonly id: number;
  readonly name: string;
  readonly url: string | null;
  readonly summary: string | null;
  readonly releaseDate: string | null; // Format: "YYYY-MM-DD"
  readonly genres: readonly string[];
  readonly platforms: readonly string[];
  readonly developers: readonly string[];
  readonly publishers: readonly string[];
  readonly criticRating: number | null; // 0-100, aggregated from external critics
  readonly criticRatingCount: number | null;
  readonly userRating: number | null; // 0-100, IGDB users
  readonly userRatingCount: number | null;
};

export type IgdbInvolvedCompanyResponse = {
  readonly developer?: boolean;
  readonly publisher?: boolean;
  readonly company?: { readonly name?: string };
};

export type IgdbRatedGameResponse = {
  readonly id: number;
  readonly name: string;
  readonly url?: string;
  readonly summary?: string;
  readonly first_release_date?: number; // unix seconds
  readonly genres?: readonly { readonly name?: string }[];
  readonly platforms?: readonly { readonly name?: string }[];
  readonly aggregated_rating?: number;
  readonly aggregated_rating_count?: number;
  readonly rating?: number;
  readonly rating_count?: number;
  readonly involved_companies?: readonly IgdbInvolvedCompanyResponse[];
};
