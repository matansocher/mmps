import { z } from 'zod';
import { Logger } from '@core/utils';
import { getResponse } from '@services/openai';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import type { WoltRestaurant } from '@shared/wolt';

const logger = new Logger('rankRestaurantsByRelevance');

const RankedRestaurantsSchema = z.object({
  rankedNames: z.array(z.string()),
});

const INSTRUCTIONS = `You are a search relevance ranker. Given a search query and a list of restaurant names, return the names reordered by relevance to the query.

Ranking criteria (highest to lowest priority):
1. Exact match — name IS the query
2. Full phrase match — name contains the entire query as a contiguous substring
3. All words match — all search words appear in the name
4. More words match — partial matches with more query words rank higher
5. Word position — matches at the start of the name rank higher
6. Substring proportion — shorter names where the match is a larger portion rank higher

Return ALL names from the input list, reordered by relevance. Do not add or remove any names.`;

export async function rankRestaurantsByRelevance(restaurants: WoltRestaurant[], searchInput: string): Promise<WoltRestaurant[]> {
  try {
    const names = restaurants.map((r) => r.name);
    const input = `Search query: "${searchInput}"\n\nRestaurant names:\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;

    const { result } = await getResponse({
      input,
      instructions: INSTRUCTIONS,
      schema: RankedRestaurantsSchema,
      model: CHAT_COMPLETIONS_MINI_MODEL,
      temperature: 0,
      store: false,
    });

    const rankMap = new Map<string, number>();
    result.rankedNames.forEach((name: string, index: number) => rankMap.set(name, index));

    return [...restaurants].sort((a, b) => {
      const rankA = rankMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
      const rankB = rankMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  } catch (err) {
    logger.error(`Failed to rank restaurants: ${err}`);
    return restaurants;
  }
}
