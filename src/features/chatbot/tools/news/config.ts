import { z } from 'zod';
import { ToolConfig } from '../../types';

export const newsConfig: ToolConfig = {
  name: 'news',
  description: 'Get latest news headlines or search for specific news topics',
  schema: z.object({
    query: z.string().optional().describe('Search query for specific news topics'),
    category: z.string().optional().describe('News category (business, entertainment, health, science, sports, technology)'),
    limit: z.number().optional().describe('Number of articles to return (default: 5)'),
  }),
  keywords: ['news', 'headlines', 'articles', 'breaking', 'latest', 'current events', 'journalism'],
  instructions: 'When users ask for news, try to extract specific topics or categories. If no specific topic is mentioned, get general headlines.',
};
