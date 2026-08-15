import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getPendingRumours, markPendingRumoursSent } from '@shared/transfer-tracker';
import type { PendingRumour } from '@shared/transfer-tracker';
import { formatTransferDigest, formatTransferDigestFallback, shortClubName } from './utils';

const logger = new Logger('chatbot:scheduler:transfer-digest');

// Sends one rich-text digest of the pending transfer rumours, grouped into a table per
// deal stage, then counts the appearance so each rumour retires after its full run.
export async function transferDigest(bot: Bot): Promise<void> {
  const pending = await getPendingRumours();
  if (!pending.length) {
    return;
  }

  const rumours = dedupeByMove(pending);
  try {
    await sendDigest(bot, rumours);
    await markPendingRumoursSent(pending);
  } catch (err) {
    logger.error(`Failed to send transfer digest, keeping rumours for next digest: ${getErrorMessage(err)}`);
  }
}

async function sendDigest(bot: Bot, rumours: readonly PendingRumour[]): Promise<void> {
  try {
    await bot.api.sendRichMessage(MY_USER_ID, { markdown: formatTransferDigest(rumours) });
  } catch (err) {
    logger.error(`Telegram rejected the rich transfer table; sending readable fallback: ${getErrorMessage(err)}`);
    for (const message of formatTransferDigestFallback(rumours)) {
      await sendShortenedMessage(bot, MY_USER_ID, message);
    }
  }
}

// The feed sometimes carries the same move twice under different club spellings
// (e.g. "OL" and "Lione" for Lyon); compare the shortened names so those collapse,
// and keep the higher-probability copy.
function dedupeByMove(rumours: readonly PendingRumour[]): PendingRumour[] {
  const bestByMove = new Map<string, PendingRumour>();
  for (const rumour of rumours) {
    const key = `${rumour.playerName}:${shortClubName(rumour.fromClub)}:${shortClubName(rumour.toClub)}:${rumour.status}`.toLowerCase();
    const current = bestByMove.get(key);
    if (!current || rumour.probability > current.probability) {
      bestByMove.set(key, rumour);
    }
  }
  return [...bestByMove.values()];
}
