import axios from 'axios';
import { env } from 'node:process';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { ExpectedGoogleArticle, GoogleArticle } from './interface';

const GOOGLE_CUSTOM_SEARCH_BASE_URL = 'https://www.googleapis.com/customsearch/v1';
const MAX_SEARCH_RESULTS = 5;

@Injectable()
export class GoogleSearchService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async searchContent(query: string): Promise<GoogleArticle[] | undefined> {
    try {
      const rawArticles = await this.getRawArticles(query);

      const articlesContents: GoogleArticle[] = await Promise.all(
        rawArticles.map(async (article: GoogleArticle) => {
          const content = await this.getArticleContent(article.link);
          return { ...article, content };
        }),
      );

      return articlesContents.filter((article: GoogleArticle) => !!article?.content?.length);
    } catch (err) {
      this.logger.error(this.searchContent.name, `error searching content in google: ${this.utilsService.getErrorMessage(err)}`);
      return undefined;
    }
  }

  async getRawArticles(query: string): Promise<GoogleArticle[]> {
    try {
      const queryParams = {
        key: env.GOOGLE_CUSTOM_SEARCH_API_KEY,
        cx: env.GOOGLE_CUSTOM_SEARCH_ENGINE_KEY,
        q: encodeURIComponent(query),
        ...(this.utilsService.isHebrew(query) ? { lr: 'lang_he' } : {}),
      };
      const url = `${GOOGLE_CUSTOM_SEARCH_BASE_URL}?${new URLSearchParams(queryParams)}`;
      const response = await axios.get(url);
      return response?.data?.items
        ?.slice(0, MAX_SEARCH_RESULTS)
        .map((item: ExpectedGoogleArticle) => ({ title: item.title, link: item.link, snippet: item.snippet }));
    } catch (err) {
      this.logger.error(this.getRawArticles.name, `error searching content in google: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  async getArticleContent(url: string): Promise<string> {
    try {
      return '';
    } catch (err) {
      this.logger.error(this.getArticleContent.name, `error getting article content: ${this.utilsService.getErrorMessage(err)}`);
      return '';
    }
  }
}
