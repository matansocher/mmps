import { createRng, hashSeed } from '../engine';
import { getTeamById, getTeamsByLeague } from '../mongo/reference.repository';
import {
  computeTeamOverall,
  createOffer,
  ensureCareerTeam,
  executeTransfer,
  expireStaleOffers,
  getCareerTeam,
  getEffectiveSquad,
  getEffectiveSquads,
} from '../mongo/transfer.repository';
import type { CareerDocument } from '../types';
import { canAfford, canSign, openWindowForMatchday, windowKey } from './logic';

// Ensures every club in the league has a budget row for the current window and
// resets per-window signing counters when a new window opens.
export async function syncBudgets(career: CareerDocument): Promise<void> {
  const wk = windowKey(career.seasonNumber, career.currentMatchday);
  const teams = await getTeamsByLeague(career.leagueId);
  const squads = await getEffectiveSquads(
    career._id,
    teams.map((t) => t.eaTeamId),
  );
  await Promise.all(teams.map((t) => ensureCareerTeam(career._id, t.eaTeamId, computeTeamOverall(squads.get(t.eaTeamId) ?? []) || t.overall, wk)));
}

// Runs the AI transfer market for the current matchday while a window is open:
//  1. expire stale incoming offers,
//  2. simulate a handful of AI-to-AI deals (respecting the per-window cap + budgets),
//  3. generate incoming AI bids for the user's players (as pending offers).
// Deterministic per career:season:matchday so replays are stable.
export async function runAiTransferRound(career: CareerDocument): Promise<void> {
  await expireStaleOffers(career._id, career.currentMatchday);

  const window = openWindowForMatchday(career.currentMatchday);
  if (!window) return;

  await syncBudgets(career);

  const rng = createRng(hashSeed(`${career._id}:${career.seasonNumber}:${career.currentMatchday}:transfers`));
  const teams = await getTeamsByLeague(career.leagueId);
  const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
  const aiTeams = teams.filter((t) => t.eaTeamId !== career.clubTeamId);

  // 1-3 AI-to-AI deals per matchday during a window.
  const dealCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < dealCount; i++) {
    const buyer = aiTeams[Math.floor(rng() * aiTeams.length)];
    const seller = aiTeams[Math.floor(rng() * aiTeams.length)];
    if (!buyer || !seller || buyer.eaTeamId === seller.eaTeamId) continue;

    const [buyerState, sellerSquad] = await Promise.all([getCareerTeam(career._id, buyer.eaTeamId), getEffectiveSquad(career._id, seller.eaTeamId)]);
    if (!buyerState || !canSign(buyerState.signingsThisWindow) || sellerSquad.length <= 16) continue;

    // Sell a mid-tier squad player (not the star, not the last man) to keep it plausible.
    const target = sellerSquad[3 + Math.floor(rng() * Math.max(1, sellerSquad.length - 6))];
    if (!target) continue;
    const fee = Math.round(target.valueEur * (0.9 + rng() * 0.3));
    if (!canAfford(buyerState.budget, fee) || fee <= 0) continue;

    await executeTransfer({
      careerId: career._id,
      seasonNumber: career.seasonNumber,
      matchday: career.currentMatchday,
      player: target,
      fromTeamId: seller.eaTeamId,
      fromTeamName: seller.name,
      toTeamId: buyer.eaTeamId,
      toTeamName: buyer.name,
      amount: fee,
    });
  }

  // Incoming AI bids for the user's players (retention hook). 0-2 per matchday.
  await maybeBidForUserPlayers(career, rng, teamById);
}

async function maybeBidForUserPlayers(
  career: CareerDocument,
  rng: () => number,
  teamById: Map<number, { readonly eaTeamId: number; readonly name: string; readonly overall: number }>,
): Promise<void> {
  const userSquad = await getEffectiveSquad(career._id, career.clubTeamId);
  if (userSquad.length <= 16) return;

  const bidCount = Math.floor(rng() * 3); // 0, 1 or 2
  const aiTeamIds = [...teamById.keys()].filter((id) => id !== career.clubTeamId);

  for (let i = 0; i < bidCount; i++) {
    const target = userSquad[Math.floor(rng() * userSquad.length)];
    const bidderId = aiTeamIds[Math.floor(rng() * aiTeamIds.length)];
    const bidder = teamById.get(bidderId);
    if (!target || !bidder) continue;
    const bidderState = await getCareerTeam(career._id, bidderId);
    if (!bidderState || !canSign(bidderState.signingsThisWindow)) continue;
    const amount = Math.round(target.valueEur * (0.85 + rng() * 0.4));
    if (!canAfford(bidderState.budget, amount) || amount <= 0) continue;

    await createOffer({
      careerId: career._id,
      seasonNumber: career.seasonNumber,
      playerId: target.eaPlayerId,
      playerName: target.shortName,
      fromTeamId: bidderId,
      toTeamId: career.clubTeamId,
      amount,
      status: 'pending',
      expiresMatchday: career.currentMatchday + 2,
    });
  }
}

// Initial budget for a freshly created career's club (used by the API on career create).
export async function initClubBudget(careerId: string, seasonNumber: number, currentMatchday: number, clubTeamId: number): Promise<void> {
  const team = await getTeamById(clubTeamId);
  const overall = team?.overall ?? 75;
  await ensureCareerTeam(careerId, clubTeamId, overall, windowKey(seasonNumber, currentMatchday));
}
