import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage } from '@core/utils';
import { searchPs5Games } from '@services/igdb';
import { getGamePrice, parsePsStoreUrl, resolveConceptIdFromProduct } from '@services/playstation-store';
import { calculateDiscountPercent, createWatch, formatPrice, getActiveWatchesByChatId, getWatch, removeWatch } from '@shared/game-price-watcher';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z.enum(['add', 'remove', 'list']).describe('The action to perform: add a game to the price watchlist, remove one, or list current watches'),
  gameName: z.string().optional().describe('The game name to watch. Used for add and remove when no PlayStation Store URL is given.'),
  url: z.string().optional().describe('Full PlayStation Store game page URL (a /concept/ or /product/ link). Preferred for add, since it identifies the game exactly.'),
});

// Resolves whatever the user gave us into a PlayStation Store concept id, which is the stable key.
async function resolveConceptId(gameName?: string, url?: string): Promise<{ conceptId: string } | { error: string }> {
  if (url) {
    const parsed = parsePsStoreUrl(url);
    if (!parsed) {
      return { error: 'That does not look like a PlayStation Store game link. Open the game page on store.playstation.com and copy the URL.' };
    }
    if (parsed.kind === 'concept') {
      return { conceptId: parsed.id };
    }
    const conceptId = await resolveConceptIdFromProduct(parsed.id);
    return conceptId ? { conceptId } : { error: 'Could not resolve that PlayStation Store product link to a game page.' };
  }

  if (!gameName) {
    return { error: 'A game name or a PlayStation Store URL is required.' };
  }

  const [match] = await searchPs5Games(gameName, 1);
  if (!match) {
    return { error: `No PS5 game found matching "${gameName}".` };
  }
  if (!match.psStoreProductId) {
    return { error: `Found ${match.name}, but there is no PlayStation Store listing linked to it. Paste the store page URL instead.` };
  }

  const conceptId = await resolveConceptIdFromProduct(match.psStoreProductId);
  return conceptId ? { conceptId } : { error: `Found ${match.name}, but its PlayStation Store page could not be opened. Paste the store page URL instead.` };
}

async function handleAdd(gameName?: string, url?: string): Promise<string> {
  const resolved = await resolveConceptId(gameName, url);
  if ('error' in resolved) {
    return JSON.stringify({ success: false, error: resolved.error });
  }

  const existing = await getWatch(chatId, resolved.conceptId);
  if (existing) {
    return JSON.stringify({ success: false, error: `Already watching ${existing.name}, currently at ${formatPrice(existing.lowestPrice, existing.currency)}.` });
  }

  const game = await getGamePrice(resolved.conceptId);
  if (!game) {
    return JSON.stringify({ success: false, error: 'That game has no standalone purchase price right now, so there is no baseline to watch. It may be subscription only or not yet released.' });
  }

  const { price } = game;
  await createWatch({
    chatId,
    conceptId: game.conceptId,
    name: game.name,
    url: game.url,
    coverUrl: game.coverUrl,
    currency: price.currencyCode,
    basePrice: price.basePriceValue,
    lowestPrice: price.discountedValue,
  });

  const percent = calculateDiscountPercent(price.basePriceValue, price.discountedValue);
  const current = formatPrice(price.discountedValue, price.currencyCode);
  const onSale = percent > 0 ? ` (already ${percent}% off ${formatPrice(price.basePriceValue, price.currencyCode)})` : '';

  return JSON.stringify({
    success: true,
    message: `Now watching ${game.name} at ${current}${onSale}. I'll DM you in the daily digest whenever it drops below that.`,
  });
}

async function handleRemove(gameName?: string, url?: string): Promise<string> {
  const watches = await getActiveWatchesByChatId(chatId);
  if (!watches.length) {
    return JSON.stringify({ success: false, error: 'You are not watching any game prices right now.' });
  }

  const parsed = url ? parsePsStoreUrl(url) : null;
  const target =
    parsed?.kind === 'concept' ? watches.find((watch) => watch.conceptId === parsed.id) : gameName ? watches.find((watch) => watch.name.toLowerCase().includes(gameName.toLowerCase())) : null;

  if (!target) {
    return JSON.stringify({ success: false, error: `No matching watch found for "${gameName ?? url}".` });
  }

  await removeWatch(chatId, target.conceptId);
  return JSON.stringify({ success: true, message: `Stopped watching the price of ${target.name}.` });
}

async function handleList(): Promise<string> {
  const watches = await getActiveWatchesByChatId(chatId);
  if (!watches.length) {
    return JSON.stringify({ success: true, games: [], message: 'You are not watching any game prices right now.' });
  }

  const games = watches.map((watch) => ({
    name: watch.name,
    lowestSeen: formatPrice(watch.lowestPrice, watch.currency),
    fullPrice: formatPrice(watch.basePrice, watch.currency),
    discountPercent: calculateDiscountPercent(watch.basePrice, watch.lowestPrice),
    url: watch.url,
  }));

  return JSON.stringify({ success: true, games });
}

async function runner({ action, gameName, url }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'add':
        return await handleAdd(gameName, url);
      case 'remove':
        return await handleRemove(gameName, url);
      case 'list':
        return await handleList();
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${getErrorMessage(err)}` });
  }
}

export const gamePriceWatcherTool = tool(runner, {
  name: 'game_price_watcher',
  description: `Watch PlayStation Store (PS5) games for price drops and get notified.

Actions:
- add: Start watching a game's price. Accepts a game name, or a PlayStation Store URL which is more reliable. Stores the current standalone purchase price as the baseline. A daily scheduler re-checks every watched game and sends one combined digest listing the games that reached a new low.
- remove: Stop watching a game's price. Accepts the game name or its PlayStation Store concept URL.
- list: List all games you are currently watching, with the lowest price seen so far.

Prices are tracked on the Israeli storefront in ILS. Subscription "Included" prices such as PS Plus are ignored, only the real purchase price counts.`,
  schema,
});
