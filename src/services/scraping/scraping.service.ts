import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';

@Injectable()
export class ScrapingService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getArticleContent(url: string): Promise<string> {
    try {
      const browser: Browser = await chromium.launch({ headless: true });
      const page: Page = await browser.newPage();
      await Promise.all([page.goto(url, { waitUntil: 'networkidle' }), page.waitForSelector('body')]);
      const content: string = await page.content();
      await browser.close();
      return content;
    } catch (err) {
      this.logger.error(this.getArticleContent.name, `error getting article content: ${this.utilsService.getErrorMessage(err)}`);
      return '';
    }
  }

  getTextFromHtml(html: string): string {
    const $ = cheerio.load(html);
    return $('h1, h2, h3, h4, h5, h6, p')
      .map((i, el) => $(el).text())
      .get()
      .join('\n');
  }
}
