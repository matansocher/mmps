import axios from 'axios';
import { NewsItem } from './types';

const baseURL = 'https://newsapi.org/v2';

export async function getNews(country: string, category: string | undefined, limit: number, apiKey: string): Promise<NewsItem[]> {
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

export async function searchNews(query: string, limit: number, apiKey: string): Promise<NewsItem[]> {
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
