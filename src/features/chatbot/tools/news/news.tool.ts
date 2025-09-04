import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getNews, searchNews } from '@services/news-api';

const schema = z.object({
  query: z.string().optional().describe('Search query for specific news topics'),
  category: z.string().optional().describe('News category (business, entertainment, health, science, sports, technology)'),
  limit: z.number().optional().describe('Number of articles to return (default: 5)'),
});

async function runner({ query, category, limit = 5 }: z.infer<typeof schema>) {
  if (query) {
    return await searchNews(query, limit);
  } else {
    return await getNews('us', category, limit);
  }
}

export const newsTool = tool(runner, {
  name: 'news',
  description: 'Get latest news headlines or search for specific news topics',
  schema,
});
