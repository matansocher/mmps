import axios from 'axios';
import { env } from 'node:process';
import { ToolExecutionContext } from '../../types';
import { newsConfig } from './config';

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
}

export class NewsTool {
  getName(): string {
    return newsConfig.name;
  }

  getDescription(): string {
    return newsConfig.description;
  }

  getParameters(): any[] {
    return newsConfig.parameters;
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
        return await this.searchNews(query, limit, apiKey);
      } else {
        return await this.getNews('us', category, limit, apiKey);
      }
    } catch (error) {
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }

  private async getNews(country: string, category: string | undefined, limit: number, apiKey: string): Promise<NewsItem[]> {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country,
        category,
        apiKey,
        pageSize: limit,
      },
    });

    const articles = response.data.articles;

    return articles.map((article: any) => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      publishedAt: article.publishedAt,
      source: article.source.name,
    }));
  }

  private async searchNews(query: string, limit: number, apiKey: string): Promise<NewsItem[]> {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        apiKey,
        pageSize: limit,
        sortBy: 'publishedAt',
      },
    });

    const articles = response.data.articles;

    return articles.map((article: any) => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      publishedAt: article.publishedAt,
      source: article.source.name,
    }));
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
