import type { CompetitionDetails, MatchDetails } from '@services/scores-365';
import { COMPETITION_IDS_MAP, getAllCompetitionMatches } from '@services/scores-365';
import { classifyMatchStatus } from '@shared/sports';

const WORLD_CUP_ID = COMPETITION_IDS_MAP.WORLD_CUP;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cached: { data: CompetitionDetails; ts: number } | null = null;

async function fetchAllWorldCupMatches(): Promise<CompetitionDetails> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  const result = await getAllCompetitionMatches(WORLD_CUP_ID);
  if (result?.matches?.length) {
    cached = { data: result, ts: Date.now() };
  }
  return result;
}

export async function getWorldCupMatches(): Promise<MatchDetails[]> {
  const result = await fetchAllWorldCupMatches();
  return result?.matches ?? [];
}

export async function getWorldCupScheduledMatches(): Promise<MatchDetails[]> {
  const matches = await getWorldCupMatches();
  return matches.filter((m) => classifyMatchStatus(m) === 'scheduled');
}

export async function getWorldCupFinishedMatches(): Promise<MatchDetails[]> {
  const matches = await getWorldCupMatches();
  return matches.filter((m) => classifyMatchStatus(m) === 'finished');
}

export async function getWorldCupLiveMatches(): Promise<MatchDetails[]> {
  const matches = await getWorldCupMatches();
  return matches.filter((m) => classifyMatchStatus(m) === 'live');
}

export function findMatchById(matches: MatchDetails[], matchId: number): MatchDetails | undefined {
  return matches.find((m) => m.id === matchId);
}
