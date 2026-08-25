import { getErrorMessage, Logger } from '@core/utils';
import { searchEvents } from '@services/polymarket';
import type { EventSummary } from '@services/polymarket';

const logger = new Logger('chatbot:scheduler:find-match-event');

const KICKOFF_TOLERANCE_MS = 24 * 60 * 60 * 1000;
const MIN_PREFIX_LENGTH = 4;

// Club-name filler that carries no identity, so "Inter" can match "FC Internazionale Milano"
const NOISE_TOKENS = new Set(['ac', 'afc', 'as', 'bk', 'calcio', 'cf', 'club', 'de', 'fc', 'fk', 'gf', 'if', 'sc', 'sk', 'the']);

const TITLE_SPLIT_PATTERN = /\svs\.?\s/i;
const SIDE_MARKET_PATTERN = /\s-\s/; // "Team A vs. Team B - Exact Score"

export function tokenizeTeamName(name: string): string[] {
  const tokens = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // "Málaga" and "Malaga" have to produce the same token
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !NOISE_TOKENS.has(token));
  return [...new Set(tokens)];
}

function tokensAlike(a: string, b: string): boolean {
  return a === b || (a.length >= MIN_PREFIX_LENGTH && b.startsWith(a)) || (b.length >= MIN_PREFIX_LENGTH && a.startsWith(b));
}

// A side is only claimed when the team hits a token that the opposing side does not also carry,
// so shared words such as "Real" or "Maccabi" can never decide a fixture on their own
function claimsSide(teamTokens: string[], sideTokens: string[], otherSideTokens: string[]): boolean {
  return sideTokens.some((sideToken) => teamTokens.some((teamToken) => tokensAlike(teamToken, sideToken)) && !otherSideTokens.some((otherToken) => tokensAlike(otherToken, sideToken)));
}

export function isMatchEventFor(event: EventSummary, homeTeam: string, awayTeam: string, kickoff: Date): boolean {
  if (event.closed || SIDE_MARKET_PATTERN.test(event.title)) {
    return false;
  }

  const sides = event.title.split(TITLE_SPLIT_PATTERN);
  if (sides.length !== 2) {
    return false;
  }

  if (!event.endDate) {
    return false;
  }

  const endTime = new Date(event.endDate).getTime();
  if (Number.isNaN(endTime) || Math.abs(endTime - kickoff.getTime()) > KICKOFF_TOLERANCE_MS) {
    return false;
  }

  const [titleHomeTokens, titleAwayTokens] = sides.map(tokenizeTeamName);
  const homeTokens = tokenizeTeamName(homeTeam);
  const awayTokens = tokenizeTeamName(awayTeam);

  // Polymarket sometimes lists the fixture with the sides swapped, so accept either orientation
  const sameOrder = claimsSide(homeTokens, titleHomeTokens, titleAwayTokens) && claimsSide(awayTokens, titleAwayTokens, titleHomeTokens);
  const swappedOrder = claimsSide(homeTokens, titleAwayTokens, titleHomeTokens) && claimsSide(awayTokens, titleHomeTokens, titleAwayTokens);
  return sameOrder || swappedOrder;
}

export async function findMatchEventSlug(homeTeam: string, awayTeam: string, kickoff: Date): Promise<string | null> {
  // Both names first; single names are fallbacks for when the two naming styles differ too much to rank well
  const queries = [`${homeTeam} ${awayTeam}`, homeTeam, awayTeam];

  for (const query of queries) {
    try {
      const { events } = await searchEvents(query);
      const match = events.find((event) => isMatchEventFor(event, homeTeam, awayTeam, kickoff));
      if (match) {
        return match.slug;
      }
    } catch (err) {
      logger.warn(`Polymarket search failed for '${query}': ${getErrorMessage(err)}`);
    }
  }

  return null;
}
