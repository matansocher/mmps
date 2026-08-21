import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage } from '@core/utils';
import { getPs5GameById, searchPs5Games } from '@services/igdb';
import type { IgdbGame } from '@services/igdb';
import { createFollow, formatDaysUntilRelease, getActiveFollowsByChatId, getDaysUntilRelease, getFollow, removeFollow } from '@shared/game-releases';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z.enum(['follow', 'unfollow', 'list', 'search']).describe('The action to perform: follow a game, unfollow one, list followed games, or search the PS5 catalog'),
  gameName: z.string().optional().describe('The game name to search for. Required for search, and for follow/unfollow when no igdbId is given.'),
  igdbId: z.number().optional().describe('The IGDB game id, returned by search. Use it to follow or unfollow an exact game when the name is ambiguous.'),
});

function describeRelease(game: Pick<IgdbGame, 'release'>): string {
  const { date, human, status } = game.release;
  if (status === 'tba') {
    return 'release date TBA';
  }
  if (!date) {
    return `expected ${human}`;
  }
  return `${human} (${formatDaysUntilRelease(getDaysUntilRelease(date))})`;
}

async function resolveGame(gameName?: string, igdbId?: number): Promise<IgdbGame | null> {
  if (igdbId) {
    return getPs5GameById(igdbId);
  }
  if (!gameName) {
    return null;
  }
  const [match] = await searchPs5Games(gameName, 1);
  return match ?? null;
}

async function handleSearch(gameName?: string): Promise<string> {
  if (!gameName) {
    return JSON.stringify({ success: false, error: 'A game name is required to search.' });
  }

  const games = await searchPs5Games(gameName);
  if (!games.length) {
    return JSON.stringify({ success: true, games: [], message: `No PS5 games found matching "${gameName}".` });
  }

  const results = games.map((game) => ({ igdbId: game.id, name: game.name, release: describeRelease(game), status: game.release.status }));
  return JSON.stringify({ success: true, games: results });
}

async function handleFollow(gameName?: string, igdbId?: number): Promise<string> {
  if (!gameName && !igdbId) {
    return JSON.stringify({ success: false, error: 'A game name or an igdbId is required to follow a game.' });
  }

  const game = await resolveGame(gameName, igdbId);
  if (!game) {
    return JSON.stringify({ success: false, error: `No PS5 game found matching "${gameName ?? igdbId}".` });
  }

  if (game.release.status === 'released') {
    return JSON.stringify({ success: false, error: `${game.name} is already out (${game.release.human}), so there is nothing to wait for.` });
  }

  const existing = await getFollow(chatId, game.id);
  if (existing) {
    return JSON.stringify({ success: false, error: `You are already following ${existing.name}.` });
  }

  await createFollow({
    chatId,
    igdbId: game.id,
    name: game.name,
    slug: game.slug,
    coverUrl: game.coverUrl,
    releaseDate: game.release.date,
    releaseHuman: game.release.human,
    releaseStatus: game.release.status,
  });

  return JSON.stringify({
    success: true,
    message: `Now following ${game.name} — ${describeRelease(game)}. You'll get it in the weekly digest, plus a message if the date changes or it releases.`,
  });
}

async function handleUnfollow(gameName?: string, igdbId?: number): Promise<string> {
  if (!gameName && !igdbId) {
    return JSON.stringify({ success: false, error: 'A game name or an igdbId is required to unfollow a game.' });
  }

  const follows = await getActiveFollowsByChatId(chatId);
  const target = igdbId ? follows.find((follow) => follow.igdbId === igdbId) : follows.find((follow) => follow.name.toLowerCase().includes(gameName.toLowerCase()));
  if (!target) {
    return JSON.stringify({ success: false, error: `You are not following a game matching "${gameName ?? igdbId}".` });
  }

  await removeFollow(chatId, target.igdbId);
  return JSON.stringify({ success: true, message: `Stopped following ${target.name}.` });
}

async function handleList(): Promise<string> {
  const follows = await getActiveFollowsByChatId(chatId);
  if (!follows.length) {
    return JSON.stringify({ success: true, games: [], message: 'You are not following any games right now.' });
  }

  const games = follows.map((follow) => ({
    igdbId: follow.igdbId,
    name: follow.name,
    release: follow.releaseDate ? `${follow.releaseHuman} (${formatDaysUntilRelease(getDaysUntilRelease(follow.releaseDate))})` : follow.releaseHuman,
    status: follow.releaseStatus,
  }));

  return JSON.stringify({ success: true, games });
}

async function runner({ action, gameName, igdbId }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'search':
        return await handleSearch(gameName);
      case 'follow':
        return await handleFollow(gameName, igdbId);
      case 'unfollow':
        return await handleUnfollow(gameName, igdbId);
      case 'list':
        return await handleList();
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${getErrorMessage(err)}` });
  }
}

export const gameReleasesTool = tool(runner, {
  name: 'game_releases',
  description: `Follow upcoming PS5 games and get notified about their release dates. Data comes from IGDB.

Actions:
- search: Search the PS5 catalog by name and get up to 5 matches with their igdbId and release date. Use this first when the name is ambiguous, then follow by igdbId.
- follow: Start following an upcoming PS5 game, by name or by igdbId. Stores the current release date as the baseline. A weekly digest lists every followed game with days until release, and a daily check DMs you when the date shifts or the game finally comes out. Already-released games cannot be followed.
- unfollow: Stop following a game, by name or by igdbId.
- list: List every game you currently follow, with its release date and days remaining.`,
  schema,
});
