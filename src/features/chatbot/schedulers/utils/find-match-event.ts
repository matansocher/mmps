import { getErrorMessage, Logger } from '@core/utils';
import { searchEvents } from '@services/polymarket';
import type { EventSummary } from '@services/polymarket';

const logger = new Logger('chatbot:scheduler:find-match-event');

const KICKOFF_TOLERANCE_MS = 24 * 60 * 60 * 1000;
const MIN_PREFIX_LENGTH = 4;

// Club-name filler that carries no identity, so "Inter" can match "FC Internazionale Milano"
const NOISE_TOKENS = new Set(['ac', 'afc', 'as', 'bk', 'calcio', 'cf', 'club', 'de', 'fc', 'fk', 'gf', 'if', 'sc', 'sk', 'the']);

const MATCH_TITLE_PATTERN = /\svs\.?\s/i;
const SIDE_MARKET_PATTERN = /\s-\s/; // "Team A vs. Team B - Exact Score"

export function tokenizeTeamName(name: string): string[] {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !NOISE_TOKENS.has(token));
  return [...new Set(tokens)];
}

function tokensOverlap(teamTokens: string[], titleTokens: string[]): boolean {
  return teamTokens.some((teamToken) =>
    titleTokens.some(
      (titleToken) =>
        teamToken === titleToken || (teamToken.length >= MIN_PREFIX_LENGTH && titleToken.startsWith(teamToken)) || (titleToken.length >= MIN_PREFIX_LENGTH && teamToken.startsWith(titleToken)),
    ),
  );
}

export function isMatchEventFor(event: EventSummary, homeTeam: string, awayTeam: string, kickoff: Date): boolean {
  if (event.closed || !MATCH_TITLE_PATTERN.test(event.title) || SIDE_MARKET_PATTERN.test(event.title)) {
    return false;
  }

  if (!event.endDate) {
    return false;
  }

  const endTime = new Date(event.endDate).getTime();
  if (Number.isNaN(endTime) || Math.abs(endTime - kickoff.getTime()) > KICKOFF_TOLERANCE_MS) {
    return false;
  }

  const titleTokens = tokenizeTeamName(event.title);
  return tokensOverlap(tokenizeTeamName(homeTeam), titleTokens) && tokensOverlap(tokenizeTeamName(awayTeam), titleTokens);
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
