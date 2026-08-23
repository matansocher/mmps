import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { sendRichMessage } from '@services/telegram';
import { formatDaysUntilRelease, getActiveFollows, getDaysUntilRelease } from '@shared/game-releases';
import type { GameFollow } from '@shared/game-releases';

const logger = new Logger('chatbot:scheduler:game-release-digest');

// Games without a concrete date sort after the dated ones instead of jumping to the top.
function sortKey(follow: GameFollow): number {
  return follow.releaseDate ? follow.releaseDate.getTime() : Number.MAX_SAFE_INTEGER;
}

export function buildDigestMessage(follows: readonly GameFollow[], now: Date = new Date()): string {
  const sorted = [...follows].sort((a, b) => sortKey(a) - sortKey(b));

  const rows = sorted.map((follow) => {
    const release = follow.releaseDate ? `${follow.releaseHuman} · ${formatDaysUntilRelease(getDaysUntilRelease(follow.releaseDate, now))}` : follow.releaseHuman;
    return `| ${follow.name} | ${release} |`;
  });

  return ['🎮 *Games you are waiting for*', '', '| Game | Release |', '|:-----|:--------|', ...rows].join('\n');
}

// Weekly rundown of every followed game with its countdown.
export async function gameReleaseDigest(bot: Bot): Promise<void> {
  try {
    const follows = await getActiveFollows();
    if (!follows.length) {
      return;
    }

    const followsByChatId = new Map<number, GameFollow[]>();
    for (const follow of follows) {
      const existing = followsByChatId.get(follow.chatId) ?? [];
      existing.push(follow);
      followsByChatId.set(follow.chatId, existing);
    }

    for (const [chatId, chatFollows] of followsByChatId) {
      await sendRichMessage(bot, chatId, buildDigestMessage(chatFollows));
    }
  } catch (err) {
    logger.error(`Failed to send the weekly game release digest: ${getErrorMessage(err)}`);
  }
}
