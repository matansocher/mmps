import { randomUUID } from 'node:crypto';
import { getServerCosmetic } from './cosmetics.config';
import { getIsraelDate, getIsraelMonth, getPreviousIsraelDate, getWeekKey } from './date';
import { ISRAEL_GEO_CONFIG, NAVIGATOR_TITLES } from './israel-geo.config';
import { createDailyAttempt } from './mongo';
import { toPlayerProfile, updatePlayer } from './mongo/player.repository';
import type { CityMastery, CoinReward, GameMode, IsraelGeoPlayer, ProgressionResult, RoundResult, XpReward } from './types';

const COMPLETION_COINS = 25;
const CIRCLE_HIT_COINS = 5;
const NEW_STAMP_COINS = 10;
const COMPLETION_XP = 50;
const DAILY_COMPLETION_XP = 25;
const CIRCLE_HIT_XP = 10;
const NEW_STAMP_XP = 25;
const MAX_RECENT_SESSIONS = 10;

function precisionReward(radiusKm: number): number {
  if (radiusKm <= 5) return 15;
  if (radiusKm <= 15) return 10;
  if (radiusKm <= 30) return 5;
  return 0;
}

function crownTier(points: number): CityMastery['tier'] {
  if (points >= ISRAEL_GEO_CONFIG.cityCrownThresholds.crown) return 'crown';
  if (points >= ISRAEL_GEO_CONFIG.cityCrownThresholds.gold) return 'gold';
  if (points >= ISRAEL_GEO_CONFIG.cityCrownThresholds.silver) return 'silver';
  if (points >= ISRAEL_GEO_CONFIG.cityCrownThresholds.bronze) return 'bronze';
  return 'none';
}

function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = xp;
  while (remaining >= 100 + (level - 1) * 25) {
    remaining -= 100 + (level - 1) * 25;
    level += 1;
  }
  return level;
}

function titleForLevel(level: number): string {
  return NAVIGATOR_TITLES[Math.min(Math.floor((level - 1) / 5), NAVIGATOR_TITLES.length - 1)];
}

function emptyCoins(): CoinReward {
  return { completion: 0, circleHit: 0, precision: 0, newStamp: 0, total: 0 };
}

function emptyXp(): XpReward {
  return { completion: 0, circleHit: 0, precision: 0, newStamp: 0, daily: 0, crown: 0, total: 0 };
}

function addRewards<T extends CoinReward | XpReward>(left: T, right: T): T {
  return Object.fromEntries(Object.keys(left).map((key) => [key, Number(left[key as keyof T]) + Number(right[key as keyof T])])) as T;
}

function passportMilestoneCosmetics(stampCount: number): readonly string[] {
  return ['frame-first-route', 'cover-cross-country', 'map-northern-roads', 'pin-local-legend'].filter((id) => getServerCosmetic(id)!.passportMilestone! <= stampCount);
}

function applyRound(
  player: IsraelGeoPlayer,
  result: RoundResult,
  includeCompletion: boolean,
  includeDaily: boolean,
): { readonly player: IsraelGeoPlayer; readonly result: Omit<ProgressionResult, 'player'> } {
  const precision = result.circleHit ? precisionReward(result.circleRadiusKm) : 0;
  const existingStamp = player.passportStamps.find((stamp) => stamp.locality === result.locality);
  const isNewStamp = result.circleHit && !existingStamp;
  const passportStamps = !result.circleHit
    ? player.passportStamps
    : existingStamp
      ? player.passportStamps.map((stamp) => (stamp.locality === result.locality ? { ...stamp, bestRadiusKm: Math.min(stamp.bestRadiusKm, result.circleRadiusKm) } : stamp))
      : [...player.passportStamps, { locality: result.locality, earnedAt: new Date(), bestRadiusKm: result.circleRadiusKm }];

  const oldMastery = player.cityMastery.find((mastery) => mastery.locality === result.locality) ?? { locality: result.locality, points: 0, tier: 'none' as const };
  const masteryPoints = result.circleHit ? 10 + precision : 0;
  const newMastery = { locality: result.locality, points: oldMastery.points + masteryPoints, tier: crownTier(oldMastery.points + masteryPoints) };
  const cityMastery = masteryPoints ? [...player.cityMastery.filter((mastery) => mastery.locality !== result.locality), newMastery] : player.cityMastery;
  const crownTierChanged = oldMastery.tier !== newMastery.tier ? newMastery : undefined;
  const crownXp = crownTierChanged ? ({ bronze: 25, silver: 50, gold: 100, crown: 200, none: 0 } as const)[crownTierChanged.tier] : 0;

  const coins: CoinReward = {
    completion: includeCompletion ? COMPLETION_COINS : 0,
    circleHit: result.circleHit ? CIRCLE_HIT_COINS : 0,
    precision,
    newStamp: isNewStamp ? NEW_STAMP_COINS : 0,
    total: (includeCompletion ? COMPLETION_COINS : 0) + (result.circleHit ? CIRCLE_HIT_COINS : 0) + precision + (isNewStamp ? NEW_STAMP_COINS : 0),
  };
  const xp: XpReward = {
    completion: includeCompletion ? COMPLETION_XP : 0,
    circleHit: result.circleHit ? CIRCLE_HIT_XP : 0,
    precision,
    newStamp: isNewStamp ? NEW_STAMP_XP : 0,
    daily: includeDaily ? DAILY_COMPLETION_XP : 0,
    crown: crownXp,
    total: (includeCompletion ? COMPLETION_XP : 0) + (result.circleHit ? CIRCLE_HIT_XP : 0) + precision + (isNewStamp ? NEW_STAMP_XP : 0) + (includeDaily ? DAILY_COMPLETION_XP : 0) + crownXp,
  };

  const milestoneIds = passportMilestoneCosmetics(passportStamps.length);
  const unlockedCosmeticIds = milestoneIds.filter((id) => !player.ownedCosmeticIds.includes(id));
  const xpTotal = player.xp + xp.total;
  const level = levelFromXp(xpTotal);
  const month = getIsraelMonth();
  const currentMonthly = player.monthlyProgress.month === month ? player.monthlyProgress : { month, litLocalities: [] };
  const litLocality = includeDaily && result.circleHit && !currentMonthly.litLocalities.includes(result.locality) ? result.locality : undefined;
  const litLocalities = litLocality ? [...currentMonthly.litLocalities, litLocality] : currentMonthly.litLocalities;
  const monthlyCosmeticId = litLocalities.length >= 18 ? `frame-light-up-${month}` : currentMonthly.rewardCosmeticId;
  const monthlyUnlocked = monthlyCosmeticId && !player.ownedCosmeticIds.includes(monthlyCosmeticId) ? [monthlyCosmeticId] : [];
  const badges = [
    ...player.badges,
    ...(passportStamps.length > 0 ? ['first-stamp'] : []),
    ...(passportStamps.length >= 18 ? ['passport-complete'] : []),
    ...(cityMastery.some((mastery) => mastery.tier === 'crown') ? ['first-crown'] : []),
    ...(litLocalities.length >= 18 ? ['light-up-israel'] : []),
  ];

  return {
    player: {
      ...player,
      coins: player.coins + coins.total,
      xp: xpTotal,
      level,
      title: titleForLevel(level),
      passportStamps,
      cityMastery,
      badges: [...new Set(badges)],
      monthlyProgress: { month, litLocalities, rewardCosmeticId: monthlyCosmeticId },
      ownedCosmeticIds: [...new Set([...player.ownedCosmeticIds, ...unlockedCosmeticIds, ...monthlyUnlocked])],
    },
    result: {
      coins,
      xp,
      newStamp: isNewStamp ? result.locality : undefined,
      unlockedCosmeticIds: [...unlockedCosmeticIds, ...monthlyUnlocked],
      crownTierChanged,
      litLocality,
    },
  };
}

function completeSession(player: IsraelGeoPlayer, score: number, mode: GameMode, dailyIsraelDate = getIsraelDate()): IsraelGeoPlayer {
  const dailyProgress =
    mode === 'daily-scored'
      ? {
          lastCompletedDate: dailyIsraelDate,
          currentStreak: player.dailyProgress.lastCompletedDate === getPreviousIsraelDate(dailyIsraelDate) ? player.dailyProgress.currentStreak + 1 : 1,
          bestStreak: Math.max(player.dailyProgress.bestStreak, player.dailyProgress.lastCompletedDate === getPreviousIsraelDate(dailyIsraelDate) ? player.dailyProgress.currentStreak + 1 : 1),
        }
      : player.dailyProgress;
  const badges = [...player.badges, ...(dailyProgress.currentStreak >= 7 ? ['daily-streak-7'] : []), ...(dailyProgress.currentStreak >= 30 ? ['daily-streak-30'] : [])];
  return {
    ...player,
    gamesPlayed: player.gamesPlayed + 1,
    bestScore: Math.max(player.bestScore, score),
    dailyProgress,
    badges: [...new Set(badges)],
    recentSessions: [{ id: randomUUID(), score, mode, completedAt: new Date() }, ...player.recentSessions].slice(0, MAX_RECENT_SESSIONS),
  };
}

export async function recordNormalRound(telegramUserId: number, result: RoundResult): Promise<ProgressionResult> {
  let progression: Omit<ProgressionResult, 'player'> = { coins: emptyCoins(), xp: emptyXp(), unlockedCosmeticIds: [] };
  const player = await updatePlayer(telegramUserId, (current) => {
    const applied = applyRound(current, result, result.completed, false);
    progression = applied.result;
    return result.completed ? completeSession(applied.player, result.totalScore, 'normal') : applied.player;
  });
  return { ...progression, player: toPlayerProfile(player) };
}

export async function recordDailyCompletion(telegramUserId: number, results: readonly RoundResult[], israelDate = getIsraelDate()): Promise<ProgressionResult | undefined> {
  const finalResult = results.at(-1);
  if (!finalResult) return undefined;

  let aggregateCoins = emptyCoins();
  let aggregateXp = emptyXp();
  let newStamp: string | undefined;
  let crownTierChanged: CityMastery | undefined;
  let litLocality: string | undefined;
  let unlockedCosmeticIds: readonly string[] = [];
  let recorded = false;
  const player = await updatePlayer(telegramUserId, (current) => {
    aggregateCoins = emptyCoins();
    aggregateXp = emptyXp();
    newStamp = undefined;
    crownTierChanged = undefined;
    litLocality = undefined;
    unlockedCosmeticIds = [];
    recorded = false;
    if (current.dailyProgress.lastCompletedDate === israelDate) return current;
    recorded = true;
    let next = current;
    results.forEach((result, index) => {
      const applied = applyRound(next, result, index === results.length - 1, index === results.length - 1);
      next = applied.player;
      aggregateCoins = addRewards(aggregateCoins, applied.result.coins);
      aggregateXp = addRewards(aggregateXp, applied.result.xp);
      newStamp = applied.result.newStamp ?? newStamp;
      crownTierChanged = applied.result.crownTierChanged ?? crownTierChanged;
      litLocality = applied.result.litLocality ?? litLocality;
      unlockedCosmeticIds = [...new Set([...unlockedCosmeticIds, ...applied.result.unlockedCosmeticIds])];
    });
    return completeSession(next, finalResult.totalScore, 'daily-scored', israelDate);
  });
  if (!recorded) return undefined;
  await createDailyAttempt({ telegramUserId, israelDate, score: finalResult.totalScore, completedAt: new Date() });
  return { player: toPlayerProfile(player), coins: aggregateCoins, xp: aggregateXp, newStamp, crownTierChanged, litLocality, unlockedCosmeticIds };
}

export async function purchaseCosmetic(telegramUserId: number, cosmeticId: string): Promise<IsraelGeoPlayer> {
  const cosmetic = getServerCosmetic(cosmeticId);
  if (!cosmetic?.price) throw new Error('cosmetic_not_for_sale');
  const price = getWeeklyFeaturedCosmeticId() === cosmetic.id ? Math.round(cosmetic.price * 0.8) : cosmetic.price;
  return updatePlayer(telegramUserId, (player) => {
    if (player.ownedCosmeticIds.includes(cosmetic.id)) return { ...player, equippedCosmetics: { ...player.equippedCosmetics, [cosmetic.category]: cosmetic.id } };
    if (player.coins < price) throw new Error('insufficient_coins');
    return {
      ...player,
      coins: player.coins - price,
      ownedCosmeticIds: [...player.ownedCosmeticIds, cosmetic.id],
      equippedCosmetics: { ...player.equippedCosmetics, [cosmetic.category]: cosmetic.id },
    };
  });
}

export async function equipCosmetic(telegramUserId: number, cosmeticId: string): Promise<IsraelGeoPlayer> {
  const cosmetic = getServerCosmetic(cosmeticId) ?? (cosmeticId.startsWith('frame-light-up-') ? { id: cosmeticId, category: 'share-frame' as const } : undefined);
  if (!cosmetic) throw new Error('cosmetic_not_found');
  return updatePlayer(telegramUserId, (player) => {
    if (!player.ownedCosmeticIds.includes(cosmeticId)) throw new Error('cosmetic_not_owned');
    return { ...player, equippedCosmetics: { ...player.equippedCosmetics, [cosmetic.category]: cosmeticId } };
  });
}

export async function queueWeeklyPreview(telegramUserId: number): Promise<IsraelGeoPlayer> {
  const weekKey = getWeekKey();
  const cosmeticId = getWeeklyFeaturedCosmeticId();
  return updatePlayer(telegramUserId, (player) => {
    if (player.ownedCosmeticIds.includes(cosmeticId)) throw new Error('cosmetic_already_owned');
    if (player.previewUsedWeekKey === weekKey || player.previewWeekKey === weekKey) throw new Error('preview_unavailable');
    return { ...player, previewCosmeticId: cosmeticId, previewWeekKey: weekKey };
  });
}

export async function consumeWeeklyPreview(telegramUserId: number): Promise<string | undefined> {
  let consumed: string | undefined;
  await updatePlayer(telegramUserId, (player) => {
    if (!player.previewCosmeticId || player.previewWeekKey !== getWeekKey()) return player;
    consumed = player.previewCosmeticId;
    return { ...player, previewCosmeticId: undefined, previewWeekKey: undefined, previewUsedWeekKey: getWeekKey() };
  });
  return consumed;
}

export function getWeeklyFeaturedCosmeticId(date = new Date()): string {
  const previewable = ['map-coast', 'map-desert', 'map-night', 'pin-sea', 'pin-sun', 'pin-city', 'frame-coast', 'frame-desert', 'frame-city'];
  const hash = [...getWeekKey(date)].reduce((total, character) => total + character.charCodeAt(0), 0);
  return previewable[hash % previewable.length];
}
