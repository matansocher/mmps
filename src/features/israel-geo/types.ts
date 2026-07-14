export type Coordinates = {
  readonly lat: number;
  readonly lng: number;
};

export type SearchRegion = {
  readonly name: string;
  readonly center: Coordinates;
  readonly radiusKm: number;
  readonly weight: number;
};

export type GameLocation = {
  readonly panoramaId: string;
  readonly coordinates: Coordinates;
  readonly locality: string;
};

export type CreateSessionResponse = {
  readonly sessionId: string;
  readonly round: number;
  readonly totalRounds: number;
  readonly panoramaId: string;
  readonly expiresAt: string;
  readonly previewCosmeticId?: string;
};

export type SubmitGuessData = {
  readonly round: number;
  readonly coordinates: Coordinates;
  readonly radiusKm: number;
};

export type RoundResult = {
  readonly round: number;
  readonly guess: Coordinates;
  readonly actual: Coordinates;
  readonly distanceMeters: number;
  readonly circleRadiusKm: number;
  readonly circleHit: boolean;
  readonly outsideDistanceMeters: number;
  readonly points: number;
  readonly locality: string;
  readonly totalScore: number;
  readonly completed: boolean;
  readonly nextPanoramaId?: string;
  readonly progression?: ProgressionResult;
};

export type IsraelGeoEventName = 'app_opened' | 'game_started' | 'round_completed' | 'game_completed' | 'shared';

export const ISRAEL_GEO_EVENTS: ReadonlySet<string> = new Set<IsraelGeoEventName>(['app_opened', 'game_started', 'round_completed', 'game_completed', 'shared']);

export type IsraelGeoEvent = {
  readonly event: IsraelGeoEventName;
  readonly uid?: string;
  readonly data?: Readonly<Record<string, unknown>>;
};

export type GameSessionState = {
  readonly id: string;
  readonly telegramUserId: number;
  readonly mode: GameMode;
  readonly dailyIsraelDate?: string;
  readonly currentLocation: GameLocation;
  readonly usedLocations: readonly GameLocation[];
  readonly queuedLocations: readonly GameLocation[];
  readonly results: readonly RoundResult[];
  readonly currentRound: number;
  readonly totalScore: number;
  readonly expiresAt: Date;
  readonly createdAt: Date;
};

export type GameMode = 'normal' | 'daily-scored' | 'daily-practice';

export type PassportStamp = {
  readonly locality: string;
  readonly earnedAt: Date;
  readonly bestRadiusKm: number;
};

export type CosmeticCategory = 'passport-cover' | 'map-theme' | 'pin' | 'share-frame';

export type EquippedCosmetics = Partial<Record<CosmeticCategory, string>>;

export type SessionRecord = {
  readonly id: string;
  readonly score: number;
  readonly mode: GameMode;
  readonly completedAt: Date;
};

export type CityMastery = {
  readonly locality: string;
  readonly points: number;
  readonly tier: 'none' | 'bronze' | 'silver' | 'gold' | 'crown';
};

export type MonthlyProgress = {
  readonly month: string;
  readonly litLocalities: readonly string[];
  readonly rewardCosmeticId?: string;
};

export type DailyProgress = {
  readonly lastCompletedDate?: string;
  readonly currentStreak: number;
  readonly bestStreak: number;
};

export type IsraelGeoPlayer = {
  readonly telegramUserId: number;
  readonly telegramUsername?: string;
  readonly displayName: string;
  readonly avatarId: string;
  readonly coins: number;
  readonly xp: number;
  readonly level: number;
  readonly title: string;
  readonly bestScore: number;
  readonly gamesPlayed: number;
  readonly passportStamps: readonly PassportStamp[];
  readonly cityMastery: readonly CityMastery[];
  readonly monthlyProgress: MonthlyProgress;
  readonly dailyProgress: DailyProgress;
  readonly ownedCosmeticIds: readonly string[];
  readonly equippedCosmetics: EquippedCosmetics;
  readonly previewCosmeticId?: string;
  readonly previewWeekKey?: string;
  readonly previewUsedWeekKey?: string;
  readonly recentSessions: readonly SessionRecord[];
  readonly badges: readonly string[];
  readonly shareTokenHash?: string;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PlayerProfile = {
  readonly displayName: string;
  readonly avatarId: string;
  readonly coins: number;
  readonly xp: number;
  readonly xpForNextLevel: number;
  readonly level: number;
  readonly title: string;
  readonly bestScore: number;
  readonly gamesPlayed: number;
  readonly passportStamps: readonly PassportStamp[];
  readonly localityMastery: readonly CityMastery[];
  readonly monthlyProgress: {
    readonly month: string;
    readonly litCount: number;
    readonly totalLocalities: number;
    readonly litLocalities: readonly string[];
    readonly cosmeticId?: string;
    readonly earned: boolean;
  };
  readonly currentDailyStreak: number;
  readonly bestDailyStreak: number;
  readonly ownedCosmeticIds: readonly string[];
  readonly equippedCosmetics: EquippedCosmetics;
  readonly previewCosmeticId?: string;
  readonly previewWeekKey?: string;
  readonly previewUsedWeekKey?: string;
  readonly badges: readonly string[];
  readonly crownTier: CityMastery['tier'];
};

export type CoinReward = {
  readonly completion: number;
  readonly circleHit: number;
  readonly precision: number;
  readonly newStamp: number;
  readonly total: number;
};

export type XpReward = {
  readonly completion: number;
  readonly circleHit: number;
  readonly precision: number;
  readonly newStamp: number;
  readonly daily: number;
  readonly crown: number;
  readonly total: number;
};

export type ProgressionResult = {
  readonly player: PlayerProfile;
  readonly coins: CoinReward;
  readonly xp: XpReward;
  readonly newStamp?: string;
  readonly unlockedCosmeticIds: readonly string[];
  readonly crownTierChanged?: CityMastery;
  readonly litLocality?: string;
};

export type IsraelGeoRequestUser = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
};

export type DailyRoute = {
  readonly israelDate: string;
  readonly locations: readonly GameLocation[];
  readonly createdAt: Date;
};

export type DailyAttempt = {
  readonly telegramUserId: number;
  readonly israelDate: string;
  readonly score: number;
  readonly completedAt: Date;
};
