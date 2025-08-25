import axios from 'axios';
import { env } from 'node:process';
import { NewsItem } from './types';

const baseURL = 'https://newsapi.org/v2';

function getApiKey(): string {
  const apiKey = env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('News API key not configured');
  }
  return apiKey;
}

export async function getNews(country: string, category: string | undefined, limit: number): Promise<NewsItem[]> {
  const apiKey = getApiKey();
  const response = await axios.get(`${baseURL}/top-headlines`, {
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
    image: article.urlToImage || '',
    publishedAt: article.publishedAt,
    source: article.source.name,
  }));
}

export async function searchNews(query: string, limit: number): Promise<NewsItem[]> {
  const apiKey = getApiKey();
  const response = await axios.get(`${baseURL}/everything`, {
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
    image: article.urlToImage || '',
    publishedAt: article.publishedAt,
    source: article.source.name,
  }));
}
