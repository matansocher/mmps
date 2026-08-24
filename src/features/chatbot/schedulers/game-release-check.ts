import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { getPs5GameById } from '@services/igdb';
import type { GameReleaseInfo } from '@services/igdb';
import { formatDaysUntilRelease, getActiveFollows, getDaysUntilRelease, removeFollow, updateReleaseInfo } from '@shared/game-releases';
import type { GameFollow } from '@shared/game-releases';

const logger = new Logger('chatbot:scheduler:game-release-check');

export type ReleaseChangeType = 'none' | 'released' | 'delayed' | 'moved-up' | 'announced' | 'changed';

// Compares a followed game's stored release info against a fresh IGDB lookup.
export function detectReleaseChange(follow: GameFollow, current: GameReleaseInfo): ReleaseChangeType {
  if (current.status === 'released' && follow.releaseStatus !== 'released') {
    return 'released';
  }

  if (!follow.releaseDate && current.date) {
    return 'announced';
  }

  if (follow.releaseDate && current.date) {
    if (follow.releaseDate.getTime() === current.date.getTime()) {
      return 'none';
    }
    return current.date.getTime() > follow.releaseDate.getTime() ? 'delayed' : 'moved-up';
  }

  return follow.releaseHuman === current.human ? 'none' : 'changed';
}

export function buildChangeMessage(follow: GameFollow, current: GameReleaseInfo, change: ReleaseChangeType): string | null {
  const countdown = current.date ? ` (${formatDaysUntilRelease(getDaysUntilRelease(current.date))})` : '';

  switch (change) {
    case 'released':
      return `🎮 ${follow.name} is out!\n\nIt released on ${current.human}. Go play it.`;
    case 'announced':
      return `📅 ${follow.name} finally has a date!\n\nWas "${follow.releaseHuman}", now ${current.human}${countdown}.`;
    case 'delayed':
      return `🔺 ${follow.name} was delayed.\n\nWas ${follow.releaseHuman}, now ${current.human}${countdown}.`;
    case 'moved-up':
      return `🔻 ${follow.name} moved up!\n\nWas ${follow.releaseHuman}, now ${current.human}${countdown}.`;
    case 'changed':
      return `📅 ${follow.name} release window changed.\n\nWas ${follow.releaseHuman}, now ${current.human}.`;
    default:
      return null;
  }
}

// Re-checks every followed game once a day. Announces the release (and drops the follow) when a game
// comes out, and otherwise DMs the user whenever the release date shifts.
export async function gameReleaseCheck(bot: Bot): Promise<void> {
  const follows = await getActiveFollows();
  if (!follows.length) {
    return;
  }

  for (const follow of follows) {
    await checkFollow(bot, follow);
  }
}

async function checkFollow(bot: Bot, follow: GameFollow): Promise<void> {
  const { chatId, igdbId } = follow;
  try {
    const game = await getPs5GameById(igdbId);
    if (!game) {
      return;
    }

    const change = detectReleaseChange(follow, game.release);
    if (change === 'none') {
      return;
    }

    const message = buildChangeMessage(follow, game.release, change);
    if (message) {
      await bot.api.sendMessage(chatId, message);
    }

    if (change === 'released') {
      await removeFollow(chatId, igdbId);
      return;
    }

    await updateReleaseInfo(chatId, igdbId, {
      name: game.name,
      releaseDate: game.release.date,
      releaseHuman: game.release.human,
      releaseStatus: game.release.status,
    });
  } catch (err) {
    logger.error(`Failed to check game ${igdbId} for chatId ${chatId}: ${getErrorMessage(err)}`);
  }
}
