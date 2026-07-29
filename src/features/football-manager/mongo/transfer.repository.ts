import type { ObjectId } from 'mongodb';
import { ObjectId as ObjectIdCtor } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import {
  CAREER_PLAYERS_COLLECTION,
  CAREER_TEAMS_COLLECTION,
  FOOTBALL_MANAGER_DB_NAME,
  PLAYERS_COLLECTION,
  TRANSFER_BIDS_COLLECTION,
  TRANSFER_NEWS_COLLECTION,
  TRANSFER_OFFERS_COLLECTION,
} from '../constants';
import type {
  CareerPlayerDocument,
  CareerTeamDocument,
  PlayerDocument,
  TransferBidDocument,
  TransferNewsDocument,
  TransferOfferDocument,
} from '../types';
import { budgetForOverall } from '../transfer/logic';

function getCareerPlayersCollection() {
  return getMongoCollection<CareerPlayerDocument>(FOOTBALL_MANAGER_DB_NAME, CAREER_PLAYERS_COLLECTION);
}

function getCareerTeamsCollection() {
  return getMongoCollection<CareerTeamDocument>(FOOTBALL_MANAGER_DB_NAME, CAREER_TEAMS_COLLECTION);
}

function getPlayersCollection() {
  return getMongoCollection<PlayerDocument>(FOOTBALL_MANAGER_DB_NAME, PLAYERS_COLLECTION);
}

function getBidsCollection() {
  return getMongoCollection<TransferBidDocument>(FOOTBALL_MANAGER_DB_NAME, TRANSFER_BIDS_COLLECTION);
}

function getOffersCollection() {
  return getMongoCollection<TransferOfferDocument>(FOOTBALL_MANAGER_DB_NAME, TRANSFER_OFFERS_COLLECTION);
}

function getNewsCollection() {
  return getMongoCollection<TransferNewsDocument>(FOOTBALL_MANAGER_DB_NAME, TRANSFER_NEWS_COLLECTION);
}

// --- Overlay reads (catalog + per-career deltas) ---

// Effective clubTeamId for every player who has moved in this career.
async function getOverlayMap(careerId: string): Promise<Map<number, number>> {
  const deltas = await getCareerPlayersCollection().find({ careerId }).toArray();
  return new Map(deltas.map((d) => [d.playerId, d.currentTeamId]));
}

// Effective squad of a team after applying this career's transfers.
export async function getEffectiveSquad(careerId: string, teamId: number): Promise<PlayerDocument[]> {
  const overlay = await getOverlayMap(careerId);
  const movedIn = [...overlay.entries()].filter(([, t]) => t === teamId).map(([playerId]) => playerId);
  const movedOut = new Set([...overlay.keys()]);
  // Catalog players still at this club (not moved anywhere) + players moved in.
  const catalog = await getPlayersCollection()
    .find({ $or: [{ clubTeamId: teamId, _id: { $nin: [...movedOut] } }, { _id: { $in: movedIn } }] })
    .sort({ overall: -1 })
    .toArray();
  return catalog;
}

// Effective squads for many teams at once (used by the matchday sim).
export async function getEffectiveSquads(careerId: string, teamIds: readonly number[]): Promise<Map<number, PlayerDocument[]>> {
  const overlay = await getOverlayMap(careerId);
  const result = new Map<number, PlayerDocument[]>();
  const movedIds = new Set(overlay.keys());
  for (const teamId of teamIds) {
    const movedIn = [...overlay.entries()].filter(([, t]) => t === teamId).map(([playerId]) => playerId);
    const players = await getPlayersCollection()
      .find({ $or: [{ clubTeamId: teamId, _id: { $nin: [...movedIds] } }, { _id: { $in: movedIn } }] })
      .sort({ overall: -1 })
      .toArray();
    result.set(teamId, players);
  }
  return result;
}

// Mean of the top-18 effective squad overalls (keeps team strength in step with transfers).
export function computeTeamOverall(players: readonly PlayerDocument[]): number {
  const top = players.slice(0, 18);
  if (!top.length) return 0;
  return Math.round(top.reduce((sum, p) => sum + p.overall, 0) / top.length);
}

// --- Budgets ---

// Ensures a career-team budget row exists for the given window, resetting the
// per-window signing counter when a new window opens.
export async function ensureCareerTeam(careerId: string, teamId: number, teamOverall: number, windowKeyValue: string | null): Promise<CareerTeamDocument> {
  const coll = getCareerTeamsCollection();
  const existing = await coll.findOne({ careerId, teamId });
  if (!existing) {
    const doc: CareerTeamDocument = {
      careerId,
      teamId,
      budget: budgetForOverall(teamOverall),
      signingsThisWindow: 0,
      windowKey: windowKeyValue ?? '',
      updatedAt: new Date(),
    };
    await coll.insertOne(doc);
    return doc;
  }
  // A new window opened -> reset the per-window counter.
  if (windowKeyValue && existing.windowKey !== windowKeyValue) {
    await coll.updateOne({ careerId, teamId }, { $set: { signingsThisWindow: 0, windowKey: windowKeyValue, updatedAt: new Date() } });
    return { ...existing, signingsThisWindow: 0, windowKey: windowKeyValue };
  }
  return existing;
}

export async function getCareerTeam(careerId: string, teamId: number): Promise<CareerTeamDocument | null> {
  return getCareerTeamsCollection().findOne({ careerId, teamId });
}

// --- Deal execution ---

// Moves a player between clubs: records the overlay delta, debits/credits budgets,
// increments the buyer's per-window signings, and writes a news item. Assumes all
// checks (window open, cap, affordability) already passed.
export async function executeTransfer(params: {
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly matchday: number;
  readonly player: PlayerDocument;
  readonly fromTeamId: number;
  readonly fromTeamName: string;
  readonly toTeamId: number;
  readonly toTeamName: string;
  readonly amount: number;
}): Promise<void> {
  const { careerId, seasonNumber, matchday, player, fromTeamId, fromTeamName, toTeamId, toTeamName, amount } = params;
  const now = new Date();

  await getCareerPlayersCollection().updateOne(
    { careerId, playerId: player.eaPlayerId },
    { $set: { careerId, playerId: player.eaPlayerId, currentTeamId: toTeamId, updatedAt: now } },
    { upsert: true },
  );

  await Promise.all([
    getCareerTeamsCollection().updateOne({ careerId, teamId: toTeamId }, { $inc: { budget: -amount, signingsThisWindow: 1 }, $set: { updatedAt: now } }, { upsert: true }),
    getCareerTeamsCollection().updateOne({ careerId, teamId: fromTeamId }, { $inc: { budget: amount }, $set: { updatedAt: now } }, { upsert: true }),
  ]);

  const news: TransferNewsDocument = {
    careerId,
    seasonNumber,
    matchday,
    playerId: player.eaPlayerId,
    playerName: player.shortName,
    fromTeamId,
    fromTeamName,
    toTeamId,
    toTeamName,
    amount,
    createdAt: now,
  };
  await getNewsCollection().insertOne(news);
}

// --- Bids (user -> AI) ---

export async function createBid(doc: Omit<TransferBidDocument, '_id' | 'createdAt'>): Promise<TransferBidDocument> {
  const full = { ...doc, createdAt: new Date() } as TransferBidDocument;
  const res = await getBidsCollection().insertOne(full);
  return { ...full, _id: res.insertedId };
}

export async function getBidById(careerId: string, id: string): Promise<TransferBidDocument | null> {
  if (!ObjectIdCtor.isValid(id)) return null;
  return getBidsCollection().findOne({ _id: new ObjectIdCtor(id), careerId });
}

export async function updateBidStatus(id: ObjectId, patch: Partial<TransferBidDocument>): Promise<void> {
  await getBidsCollection().updateOne({ _id: id }, { $set: { ...patch, resolvedAt: patch.status && patch.status !== 'pending' ? new Date() : null } });
}

export async function getActiveBids(careerId: string, seasonNumber: number): Promise<TransferBidDocument[]> {
  return getBidsCollection()
    .find({ careerId, seasonNumber, status: { $in: ['pending', 'countered'] } })
    .sort({ createdAt: -1 })
    .toArray();
}

// --- Offers (AI -> user) ---

export async function createOffer(doc: Omit<TransferOfferDocument, '_id' | 'createdAt'>): Promise<TransferOfferDocument> {
  const full = { ...doc, createdAt: new Date() } as TransferOfferDocument;
  const res = await getOffersCollection().insertOne(full);
  return { ...full, _id: res.insertedId };
}

export async function getOfferById(careerId: string, id: string): Promise<TransferOfferDocument | null> {
  if (!ObjectIdCtor.isValid(id)) return null;
  return getOffersCollection().findOne({ _id: new ObjectIdCtor(id), careerId });
}

export async function updateOfferStatus(id: ObjectId, status: TransferOfferDocument['status']): Promise<void> {
  await getOffersCollection().updateOne({ _id: id }, { $set: { status } });
}

export async function getPendingOffers(careerId: string, seasonNumber: number): Promise<TransferOfferDocument[]> {
  return getOffersCollection()
    .find({ careerId, seasonNumber, status: 'pending' })
    .sort({ createdAt: -1 })
    .toArray();
}

// Expire offers whose deadline has passed.
export async function expireStaleOffers(careerId: string, currentMatchday: number): Promise<void> {
  await getOffersCollection().updateMany({ careerId, status: 'pending', expiresMatchday: { $lt: currentMatchday } }, { $set: { status: 'expired' } });
}

// --- News feed ---

export async function getTransferNews(careerId: string, seasonNumber: number, limit = 40): Promise<TransferNewsDocument[]> {
  return getNewsCollection().find({ careerId, seasonNumber }).sort({ createdAt: -1 }).limit(limit).toArray();
}

// Clears all transfer state for a career (used on new career / season rollover).
export async function clearTransferState(careerId: string, seasonNumber?: number): Promise<void> {
  const filter = seasonNumber === undefined ? { careerId } : { careerId, seasonNumber };
  await Promise.all([
    getBidsCollection().deleteMany(filter),
    getOffersCollection().deleteMany(filter),
    getNewsCollection().deleteMany(filter),
  ]);
}

// Full reset for a brand-new career: also drops the squad overlay + budgets so
// no transfers, ownership changes, or budgets leak from a prior career.
export async function resetCareerTransfers(careerId: string): Promise<void> {
  await Promise.all([
    getCareerPlayersCollection().deleteMany({ careerId }),
    getCareerTeamsCollection().deleteMany({ careerId }),
    getBidsCollection().deleteMany({ careerId }),
    getOffersCollection().deleteMany({ careerId }),
    getNewsCollection().deleteMany({ careerId }),
  ]);
}

// --- Market search ---

export type MarketQuery = {
  readonly careerId: string;
  readonly name?: string;
  readonly position?: string;
  readonly leagueId?: number;
  readonly maxValue?: number;
  readonly minOverall?: number;
  readonly excludeTeamId?: number; // hide the user's own squad
  readonly limit?: number;
};

// Searches the catalog for transfer targets, applying the career overlay so a
// player's *effective* club (not the catalog club) is what's shown/filtered.
export async function searchMarket(query: MarketQuery): Promise<{ player: PlayerDocument; effectiveTeamId: number }[]> {
  const { careerId, name, position, leagueId, maxValue, minOverall, excludeTeamId, limit = 50 } = query;
  const overlay = await getOverlayMap(careerId);

  const filter: Record<string, unknown> = {};
  if (name) filter.longName = { $regex: name, $options: 'i' };
  if (position) filter.positions = position;
  if (leagueId) filter.leagueId = leagueId;
  if (typeof maxValue === 'number') filter.valueEur = { $lte: maxValue };
  if (typeof minOverall === 'number') filter.overall = { $gte: minOverall };

  // Over-fetch so we can drop the excluded club after applying the overlay.
  // Always cheapest-first so the market is sorted by cost (Feature d).
  const raw = await getPlayersCollection()
    .find(filter)
    .sort({ valueEur: 1 })
    .limit(limit * 3)
    .toArray();

  const out: { player: PlayerDocument; effectiveTeamId: number }[] = [];
  for (const p of raw) {
    const effectiveTeamId = overlay.get(p.eaPlayerId) ?? p.clubTeamId;
    if (excludeTeamId && effectiveTeamId === excludeTeamId) continue;
    out.push({ player: p, effectiveTeamId });
    if (out.length >= limit) break;
  }
  return out;
}

// Effective team id for a single player (overlay first, else catalog club).
export async function getEffectiveTeamId(careerId: string, player: PlayerDocument): Promise<number> {
  const overlay = await getOverlayMap(careerId);
  return overlay.get(player.eaPlayerId) ?? player.clubTeamId;
}

