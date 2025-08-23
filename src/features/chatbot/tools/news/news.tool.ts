import { env } from 'node:process';
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

  getParameters(): any[] {
    return newsConfig.parameters;
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

  extractParameters(userRequest: string): Record<string, any> {
    const query = this.extractNewsQueryFromRequest(userRequest);
    return query ? { query } : {};
  }

  async execute(context: ToolExecutionContext): Promise<NewsItem[]> {
    const { query, category, limit = 5 } = context.parameters;

    const apiKey = env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error('News API key not configured');
    }

    try {
      if (query) {
        return await searchNews(query, limit, apiKey);
      } else {
        return await getNews('us', category, limit, apiKey);
      }
    } catch (error) {
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }

  private extractNewsQueryFromRequest(request: string): string | null {
    const words = request.toLowerCase().split(' ');
    const newsIndex = words.findIndex((word) => word.includes('news'));

    if (newsIndex !== -1 && newsIndex + 1 < words.length) {
      return words.slice(newsIndex + 1).join(' ');
    }

    return null;
  }
}
