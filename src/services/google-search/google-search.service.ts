import axios from 'axios';
import * as cheerio from 'cheerio';
import { env } from 'node:process';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { ExpectedGoogleArticle, GoogleArticle } from './interface';

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
      const url = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${env.GOOGLE_CUSTOM_SEARCH_ENGINE_KEY}&q=${encodeURIComponent(query)}`; // &lr=lang_he
      const response = await axios.get(url);
      return response?.data?.items?.map((item: ExpectedGoogleArticle) => ({ title: item.title, link: item.link, snippet: item.snippet }));
    } catch (err) {
      this.logger.error(this.searchContent.name, `error searching content in google: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  async getArticleContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      return $('h1, h2, h3, h4, h5, h6, p')
        .map((i, el) => $(el).text())
        .get()
        .join('\n');
    } catch (err) {
      this.logger.error(this.getArticleContent.name, `error getting article content: ${this.utilsService.getErrorMessage(err)}`);
      return '';
    }
  }
}
