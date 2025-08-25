import { z } from 'zod';
import { getNews, NewsItem, searchNews } from '@services/news-api';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

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

export class NewsTool implements ToolInstance {
  getName(): string {
    return newsConfig.name;
  }

  getDescription(): string {
    return newsConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return newsConfig.schema;
  }

  getKeywords(): string[] {
    return newsConfig.keywords;
  }

  getInstructions(): string {
    return newsConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<NewsItem[]> {
    const { query, category, limit = 5 } = context.parameters;

    try {
      if (query) {
        return await searchNews(query, limit);
      } else {
        return await getNews('us', category, limit);
      }
    } catch (error) {
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }
}
