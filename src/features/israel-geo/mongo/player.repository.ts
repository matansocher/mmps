import type { Collection } from 'mongodb';
import { createHash, randomBytes } from 'node:crypto';
import { getMongoCollection } from '@core/mongo';
import { ISRAEL_GEO_CONFIG, NAVIGATOR_TITLES } from '../israel-geo.config';
import type { CityMastery, IsraelGeoPlayer, IsraelGeoRequestUser, PlayerProfile } from '../types';
import { DB_NAME, PLAYERS_COLLECTION } from './constants';

const MAX_UPDATE_ATTEMPTS = 5;

function getCollection(): Collection<IsraelGeoPlayer> {
  return getMongoCollection<IsraelGeoPlayer>(DB_NAME, PLAYERS_COLLECTION);
}

function israelMonth(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_GEO_CONFIG.timezone, year: 'numeric', month: '2-digit' }).format(date);
}

function createPlayer(user: IsraelGeoRequestUser): IsraelGeoPlayer {
  const now = new Date();
  return {
    telegramUserId: user.telegramUserId,
    telegramUsername: user.username,
    displayName: user.firstName || user.username || `Navigator ${user.telegramUserId}`,
    avatarId: ISRAEL_GEO_CONFIG.defaultAvatarId,
    coins: 0,
    xp: 0,
    level: 1,
    title: NAVIGATOR_TITLES[0],
    bestScore: 0,
    gamesPlayed: 0,
    passportStamps: [],
    cityMastery: [],
    monthlyProgress: { month: israelMonth(), litLocalities: [] },
    dailyProgress: { currentStreak: 0, bestStreak: 0 },
    ownedCosmeticIds: [],
    equippedCosmetics: {},
    recentSessions: [],
    badges: [],
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPlayerProfile(player: IsraelGeoPlayer): PlayerProfile {
  const tierOrder: Readonly<Record<CityMastery['tier'], number>> = { none: 0, bronze: 1, silver: 2, gold: 3, crown: 4 };
  const crownTier = player.cityMastery.reduce<CityMastery['tier']>((highest, mastery) => (tierOrder[mastery.tier] > tierOrder[highest] ? mastery.tier : highest), 'none');
  let xpForNextLevel = 0;
  for (let level = 1; level <= player.level; level += 1) xpForNextLevel += 100 + (level - 1) * 25;
  return {
    displayName: player.displayName,
    avatarId: player.avatarId,
    coins: player.coins,
    xp: player.xp,
    xpForNextLevel,
    level: player.level,
    title: player.title,
    bestScore: player.bestScore,
    gamesPlayed: player.gamesPlayed,
    passportStamps: player.passportStamps,
    localityMastery: player.cityMastery,
    monthlyProgress: {
      month: player.monthlyProgress.month,
      litCount: player.monthlyProgress.litLocalities.length,
      totalLocalities: 18,
      litLocalities: player.monthlyProgress.litLocalities,
      cosmeticId: player.monthlyProgress.rewardCosmeticId,
      earned: Boolean(player.monthlyProgress.rewardCosmeticId),
    },
    currentDailyStreak: player.dailyProgress.currentStreak,
    bestDailyStreak: player.dailyProgress.bestStreak,
    ownedCosmeticIds: player.ownedCosmeticIds,
    equippedCosmetics: player.equippedCosmetics,
    previewCosmeticId: player.previewCosmeticId,
    previewWeekKey: player.previewWeekKey,
    previewUsedWeekKey: player.previewUsedWeekKey,
    badges: player.badges,
    crownTier,
  };
}

export async function ensurePlayer(user: IsraelGeoRequestUser): Promise<IsraelGeoPlayer> {
  const collection = getCollection();
  const existing = await collection.findOne({ telegramUserId: user.telegramUserId });
  if (existing) {
    const currentMonth = israelMonth();
    if (existing.monthlyProgress.month !== currentMonth) {
      return updatePlayer(user.telegramUserId, (player) => ({
        ...player,
        telegramUsername: user.username ?? player.telegramUsername,
        monthlyProgress: { month: currentMonth, litLocalities: [] },
      }));
    }
    if (existing.telegramUsername !== user.username && user.username) {
      await collection.updateOne({ telegramUserId: user.telegramUserId }, { $set: { telegramUsername: user.username, updatedAt: new Date() } });
      return { ...existing, telegramUsername: user.username };
    }
    return existing;
  }
  const player = createPlayer(user);
  try {
    await collection.insertOne(player);
    return player;
  } catch (err) {
    const created = await collection.findOne({ telegramUserId: user.telegramUserId });
    if (created) return created;
    throw err;
  }
}

export async function updatePlayer(telegramUserId: number, mutate: (player: IsraelGeoPlayer) => IsraelGeoPlayer): Promise<IsraelGeoPlayer> {
  const collection = getCollection();
  for (let attempt = 0; attempt < MAX_UPDATE_ATTEMPTS; attempt += 1) {
    const current = await collection.findOne({ telegramUserId });
    if (!current) throw new Error(`Israel Geo player ${telegramUserId} not found`);
    const next = { ...mutate(current), telegramUserId, revision: current.revision + 1, createdAt: current.createdAt, updatedAt: new Date() };
    const result = await collection.replaceOne({ telegramUserId, revision: current.revision }, next);
    if (result.modifiedCount === 1) return next;
  }
  throw new Error(`Could not update Israel Geo player ${telegramUserId} due to concurrent changes`);
}

export async function updatePlayerIdentity(telegramUserId: number, displayName: string, avatarId: string): Promise<IsraelGeoPlayer> {
  return updatePlayer(telegramUserId, (player) => ({ ...player, displayName, avatarId }));
}

export async function rotateShareToken(telegramUserId: number): Promise<{ readonly player: IsraelGeoPlayer; readonly token: string }> {
  const token = randomBytes(24).toString('base64url');
  const shareTokenHash = createHash('sha256').update(token).digest('hex');
  const player = await updatePlayer(telegramUserId, (current) => ({ ...current, shareTokenHash }));
  return { player, token };
}

export async function getPlayerByShareToken(token: string): Promise<IsraelGeoPlayer | null> {
  const shareTokenHash = createHash('sha256').update(token).digest('hex');
  return getCollection().findOne({ shareTokenHash });
}

export async function ensurePlayerIndexes(): Promise<void> {
  await Promise.all([getCollection().createIndex({ telegramUserId: 1 }, { unique: true }), getCollection().createIndex({ shareTokenHash: 1 }, { unique: true, sparse: true })]);
}
