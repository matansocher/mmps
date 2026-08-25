import { format } from 'date-fns';
import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { getGamePrice } from '@services/playstation-store';
import type { PsStorePrice } from '@services/playstation-store';
import { sendRichMessage } from '@services/telegram';
import { calculateDiscountPercent, formatPrice, getActiveWatches, updateLowestPrice } from '@shared/game-price-watcher';
import type { GamePriceWatch } from '@shared/game-price-watcher';

const logger = new Logger('chatbot:scheduler:game-price-check');

export type PriceDrop = {
  readonly watch: GamePriceWatch;
  readonly price: PsStorePrice;
};

function buildDropLine(drop: PriceDrop): string {
  const { watch, price } = drop;
  const currency = price.currencyCode || watch.currency;
  const was = formatPrice(watch.lowestPrice, currency);
  const now = formatPrice(price.discountedValue, currency);
  const percent = calculateDiscountPercent(price.basePriceValue, price.discountedValue);

  const parts = [`🎮 [${watch.name}](${watch.url})`, `${was} → *${now}*${percent > 0 ? ` (-${percent}%)` : ''}`];
  if (price.endsAt) {
    parts.push(`sale ends ${format(price.endsAt, 'MMM d, yyyy')}`);
  }
  return parts.join('\n');
}

export function buildPriceDropDigest(drops: readonly PriceDrop[]): string {
  const sorted = [...drops].sort((a, b) => calculateDiscountPercent(b.price.basePriceValue, b.price.discountedValue) - calculateDiscountPercent(a.price.basePriceValue, a.price.discountedValue));
  const header = drops.length === 1 ? '💸 *Price drop on a game you are watching*' : '💸 *Price drops on games you are watching*';
  return [header, ...sorted.map(buildDropLine)].join('\n\n');
}

async function findDrop(watch: GamePriceWatch): Promise<PriceDrop | null> {
  try {
    const game = await getGamePrice(watch.conceptId);
    if (!game) {
      return null;
    }
    return game.price.discountedValue < watch.lowestPrice ? { watch, price: game.price } : null;
  } catch (err) {
    logger.error(`Failed to check game ${watch.conceptId} for chatId ${watch.chatId}: ${getErrorMessage(err)}`);
    return null;
  }
}

// Re-checks every watched PlayStation Store game once a day and sends one combined digest per chat
// listing only the games that reached a new observed low. The new low is stored after the digest is
// sent, so a failed send is retried tomorrow rather than silently swallowed.
export async function gamePriceCheck(bot: Bot): Promise<void> {
  const watches = await getActiveWatches();
  if (!watches.length) {
    return;
  }

  const dropsByChatId = new Map<number, PriceDrop[]>();
  for (const watch of watches) {
    const drop = await findDrop(watch);
    if (!drop) {
      continue;
    }
    const existing = dropsByChatId.get(watch.chatId) ?? [];
    existing.push(drop);
    dropsByChatId.set(watch.chatId, existing);
  }

  for (const [chatId, drops] of dropsByChatId) {
    try {
      await sendRichMessage(bot, chatId, buildPriceDropDigest(drops));
    } catch (err) {
      logger.error(`Failed to send the game price digest to chatId ${chatId}: ${getErrorMessage(err)}`);
      continue;
    }

    for (const { watch, price } of drops) {
      await updateLowestPrice(watch.chatId, watch.conceptId, price.discountedValue);
    }
  }
}
