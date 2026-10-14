import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getErrorMessage, Logger } from '@core/utils';
import { getRatedGameById, searchRatedGames } from '@services/igdb';
import type { IgdbRatedGame } from '@services/igdb';
import { getGame, searchGames } from '@services/metacritic';
import type { MetacriticGame } from '@services/metacritic';

const logger = new Logger('game-scores.tool');

const MAX_DESCRIPTION_LENGTH = 400;

const schema = z.object({
  action: z.enum(['search', 'details']).describe('search: find games matching a (possibly misspelled) name. details: get the full score card of one game.'),
  gameName: z.string().optional().describe('The game name as the user wrote it, typos are fine. Required for search. For details, used when no slug or igdbId is given.'),
  slug: z.string().optional().describe('The Metacritic slug of the game, returned by search when source is metacritic. Preferred for details.'),
  igdbId: z.number().optional().describe('The IGDB id of the game, returned by search when source is igdb (the fallback). Use it for details on fallback results.'),
});

function truncate(text: string | null): string | null {
  if (!text || text.length <= MAX_DESCRIPTION_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`;
}

function formatMetacriticGame(game: MetacriticGame) {
  return {
    title: game.title,
    metascore: game.criticScore.score,
    criticReviews: game.criticScore.reviewCount,
    criticSentiment: game.criticScore.sentiment,
    userScore: game.userScore?.score ?? null,
    userReviews: game.userScore?.reviewCount ?? null,
    userSentiment: game.userScore?.sentiment ?? null,
    mustPlay: game.mustPlay,
    releaseDate: game.releaseDate,
    platforms: game.platforms,
    genres: game.genres,
    developers: game.developers,
    publishers: game.publishers,
    rating: game.rating,
    description: truncate(game.description),
    url: game.url,
  };
}

function formatIgdbGame(game: IgdbRatedGame) {
  return {
    igdbId: game.id,
    title: game.name,
    criticRating: game.criticRating,
    criticReviews: game.criticRatingCount,
    userRating: game.userRating,
    userReviews: game.userRatingCount,
    releaseDate: game.releaseDate,
    platforms: game.platforms,
    genres: game.genres,
    developers: game.developers,
    publishers: game.publishers,
    description: truncate(game.summary),
    url: game.url,
  };
}

async function searchMetacritic(gameName: string) {
  try {
    return await searchGames(gameName);
  } catch (err) {
    logger.warn(`Metacritic search failed for "${gameName}", falling back to IGDB: ${getErrorMessage(err)}`);
    return null;
  }
}

async function handleSearch(gameName?: string): Promise<string> {
  if (!gameName) {
    return JSON.stringify({ success: false, error: 'A game name is required to search.' });
  }

  const metacriticGames = await searchMetacritic(gameName);
  if (metacriticGames?.length) {
    const games = metacriticGames.map(({ slug, title, criticScore, releaseDate, platforms }) => ({ slug, title, metascore: criticScore, releaseDate, platforms }));
    return JSON.stringify({ success: true, source: 'metacritic', games });
  }

  const igdbGames = await searchRatedGames(gameName);
  if (!igdbGames.length) {
    return JSON.stringify({ success: true, games: [], message: `No games found matching "${gameName}".` });
  }

  const games = igdbGames.map(({ id, name, criticRating, releaseDate, platforms }) => ({ igdbId: id, title: name, criticRating, releaseDate, platforms }));
  return JSON.stringify({ success: true, source: 'igdb', games });
}

async function getMetacriticDetails(slug?: string, gameName?: string): Promise<MetacriticGame | null> {
  try {
    const targetSlug = slug ?? (await searchGames(gameName, 1))[0]?.slug;
    return targetSlug ? await getGame(targetSlug) : null;
  } catch (err) {
    logger.warn(`Metacritic details failed for "${slug ?? gameName}", falling back to IGDB: ${getErrorMessage(err)}`);
    return null;
  }
}

async function handleDetails(gameName?: string, slug?: string, igdbId?: number): Promise<string> {
  if (!gameName && !slug && !igdbId) {
    return JSON.stringify({ success: false, error: 'A game name, slug or igdbId is required for details.' });
  }

  if (igdbId) {
    const game = await getRatedGameById(igdbId);
    return game ? JSON.stringify({ success: true, source: 'igdb', game: formatIgdbGame(game) }) : JSON.stringify({ success: false, error: `No game found with igdbId ${igdbId}.` });
  }

  const metacriticGame = await getMetacriticDetails(slug, gameName);
  if (metacriticGame) {
    return JSON.stringify({ success: true, source: 'metacritic', game: formatMetacriticGame(metacriticGame) });
  }

  const [igdbGame] = await searchRatedGames(gameName ?? slug.replace(/-/g, ' '), 1);
  if (!igdbGame) {
    return JSON.stringify({ success: false, error: `No game found matching "${gameName ?? slug}".` });
  }
  return JSON.stringify({ success: true, source: 'igdb', game: formatIgdbGame(igdbGame) });
}

async function runner({ action, gameName, slug, igdbId }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'search':
        return await handleSearch(gameName);
      case 'details':
        return await handleDetails(gameName, slug, igdbId);
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${getErrorMessage(err)}` });
  }
}

export const gameScoresTool = tool(runner, {
  name: 'game_scores',
  description: `Look up how good a video game is: its Metacritic score (metascore, critics 0-100), user score (0-10), and details like platforms, release date, genres, developer and a short description. Data comes from Metacritic, with IGDB as a fallback when Metacritic is unavailable or finds nothing.

Actions:
- search: Find games by name. The search is fuzzy, so pass the name exactly as the user wrote it, typos included. Returns up to 5 matches with their slug (Metacritic) or igdbId (IGDB fallback).
- details: Get the full score card of one game, by slug (preferred), igdbId (for IGDB results) or gameName (uses the top match).

Call order:
1. Always run search first with the user's game name.
2. If one result clearly matches what the user asked for, call details with its slug (or igdbId) and answer.
3. If the name is ambiguous or misspelled and several results could fit, do NOT pick one silently. List the matches (title, year, metascore) and ask the user which game they meant.
4. If there are no results, say so and suggest checking the spelling.

Reply format:
- Lead with the title and the metascore, then the user score, then a few details (release date, platforms, genre, developer) and one or two sentences of description. Add the Metacritic link.
- A null metascore means the game has not been reviewed yet (often unreleased); say that instead of a number.
- When the source is igdb, say the score is IGDB's critic rating, not Metacritic's, and that IGDB user ratings are on a 0-100 scale.`,
  schema,
});
