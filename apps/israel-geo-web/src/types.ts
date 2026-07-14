export type Coordinates = {
  readonly lat: number;
  readonly lng: number;
};

export type CrownTier = 'none' | 'bronze' | 'silver' | 'gold' | 'crown';

export type MonthlyProgress = {
  readonly litCount: number;
  readonly totalLocalities: number;
  readonly litLocalities: readonly string[];
  readonly cosmeticId?: string;
  readonly earned: boolean;
};

export type LocalityMastery = {
  readonly locality: string;
  readonly points: number;
  readonly tier: CrownTier;
};

export type CosmeticCategory = 'passport-cover' | 'map-theme' | 'pin' | 'share-frame';

export type EquippedCosmetics = Partial<Record<CosmeticCategory, string>>;

export type PassportStamp = {
  readonly locality: string;
  readonly earnedAt: string;
  readonly bestRadiusKm: number;
};

export type PlayerProfile = {
  readonly displayName: string;
  readonly avatarId: string;
  readonly level: number;
  readonly title: string;
  readonly xp: number;
  readonly xpForNextLevel: number;
  readonly coins: number;
  readonly bestScore: number;
  readonly gamesPlayed: number;
  readonly passportStamps: readonly PassportStamp[];
  readonly localityMastery: readonly LocalityMastery[];
  readonly ownedCosmeticIds: readonly string[];
  readonly equippedCosmetics: EquippedCosmetics;
  readonly previewCosmeticId?: string;
  readonly previewWeekKey?: string;
  readonly previewUsedWeekKey?: string;
  readonly currentDailyStreak: number;
  readonly bestDailyStreak: number;
  readonly badges: readonly string[];
  readonly crownTier: CrownTier;
  readonly monthlyProgress: MonthlyProgress;
};

export type PublicProfile = {
  readonly displayName: string;
  readonly avatarId: string;
  readonly level: number;
  readonly title: string;
  readonly bestScore: number;
  readonly gamesPlayed: number;
  readonly passportStamps: readonly PassportStamp[];
  readonly badges: readonly string[];
  readonly crownTier: CrownTier;
};

export type ShareTokenResponse = {
  readonly token: string;
  readonly path: string;
};

export type Progression = {
  readonly player: PlayerProfile;
  readonly coins: CoinReward;
  readonly xp: XpReward;
  readonly newStamp?: string;
  readonly unlockedCosmeticIds: readonly string[];
  readonly crownTierChanged?: LocalityMastery;
  readonly litLocality?: string;
};

export type GameSession = {
  readonly sessionId: string;
  readonly round: number;
  readonly totalRounds: number;
  readonly panoramaId: string;
  readonly expiresAt: string;
  readonly previewCosmeticId?: string;
};

export type DailyGameSession = GameSession & {
  readonly practice: boolean;
  readonly israelDate: string;
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
  readonly progression?: Progression;
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
