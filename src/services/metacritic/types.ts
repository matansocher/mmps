export type MetacriticScore = {
  readonly score: number | null;
  readonly max: number;
  readonly reviewCount: number | null;
  readonly sentiment: string | null;
};

export type MetacriticSearchResult = {
  readonly slug: string;
  readonly title: string;
  readonly criticScore: number | null;
  readonly releaseDate: string | null; // Format: "YYYY-MM-DD"
  readonly platforms: readonly string[];
  readonly genres: readonly string[];
  readonly url: string;
};

export type MetacriticPlatformScore = {
  readonly platform: string;
  readonly criticScore: number | null;
  readonly reviewCount: number | null;
};

export type MetacriticGame = {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly releaseDate: string | null; // Format: "YYYY-MM-DD"
  readonly rating: string | null; // ESRB rating, e.g. "E10+"
  readonly genres: readonly string[];
  readonly developers: readonly string[];
  readonly publishers: readonly string[];
  readonly mustPlay: boolean;
  readonly criticScore: MetacriticScore;
  readonly userScore: MetacriticScore | null;
  readonly platforms: readonly MetacriticPlatformScore[];
  readonly url: string;
};

export type MetacriticScoreSummaryResponse = {
  readonly score?: number | null;
  readonly max?: number;
  readonly reviewCount?: number | null;
  readonly sentiment?: string | null;
};

export type MetacriticNamedResponse = {
  readonly name?: string;
};

export type MetacriticSearchItemResponse = {
  readonly type?: string;
  readonly title: string;
  readonly slug: string;
  readonly releaseDate?: string | null;
  readonly criticScoreSummary?: MetacriticScoreSummaryResponse;
  readonly genres?: readonly MetacriticNamedResponse[];
  readonly platforms?: readonly MetacriticNamedResponse[];
};

export type MetacriticSearchResponse = {
  readonly data?: { readonly items?: readonly MetacriticSearchItemResponse[] };
};

export type MetacriticCompanyResponse = {
  readonly name?: string;
  readonly typeName?: string; // "Developer" | "Publisher"
};

export type MetacriticPlatformResponse = {
  readonly name?: string;
  readonly criticScoreSummary?: MetacriticScoreSummaryResponse;
};

export type MetacriticGameResponse = {
  readonly data?: {
    readonly item?: {
      readonly title: string;
      readonly slug: string;
      readonly description?: string | null;
      readonly releaseDate?: string | null;
      readonly rating?: string | null;
      readonly mustPlay?: boolean;
      readonly genres?: readonly MetacriticNamedResponse[];
      readonly production?: { readonly companies?: readonly MetacriticCompanyResponse[] };
      readonly criticScoreSummary?: MetacriticScoreSummaryResponse;
      readonly platforms?: readonly MetacriticPlatformResponse[];
    };
  };
};

export type MetacriticUserScoreResponse = {
  readonly data?: { readonly item?: MetacriticScoreSummaryResponse };
};
