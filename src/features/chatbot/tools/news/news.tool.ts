import { z } from 'zod';
import { getNews, NewsItem, searchNews } from '@services/news-api';
import { ToolExecutionContext, ToolInstance } from '../../types';
import { newsConfig } from './config';

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
