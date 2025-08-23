import { z } from 'zod';
import { ToolConfig } from '../../types';

export const newsConfig: ToolConfig = {
  name: 'news',
  description: 'Get latest news headlines or search for specific news topics',
  parameters: [
    {
      name: 'query',
      type: 'string',
      required: false,
      description: 'Search query for specific news topics',
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      description: 'News category (business, entertainment, health, science, sports, technology)',
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      description: 'Number of articles to return (default: 5)',
    },
  ],
  schema: z.object({
    query: z.string().optional().describe('Search query for specific news topics'),
    category: z.string().optional().describe('News category (business, entertainment, health, science, sports, technology)'),
    limit: z.number().optional().describe('Number of articles to return (default: 5)'),
  }),
  keywords: ['news', 'headlines', 'articles', 'breaking', 'latest', 'current events', 'journalism'],
  instructions: 'When users ask for news, try to extract specific topics or categories. If no specific topic is mentioned, get general headlines.',
};
