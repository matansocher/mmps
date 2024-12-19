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
      const browser: Browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();
      const page = await context.newPage();
      // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'DNT': '1', 'Upgrade-Insecure-Requests': '1' });
      await page.waitForTimeout(2000); // Wait 2 seconds
      await page.mouse.move(100, 200); // Simulate user movement
      await Promise.all([page.goto(url, { waitUntil: 'networkidle' }), page.waitForSelector('body')]);
      const content: string = await page.content();
      const textContent = this.getTextFromHtml(content);
      await browser.close();
      return textContent;
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
