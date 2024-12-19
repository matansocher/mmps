import { chromium } from 'playwright';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { GoogleArticle } from './interface';

const GOOGLE_SEARCH_BASE_URL = 'https://www.google.com/search';
const MAX_SEARCH_RESULTS = 10;

@Injectable()
export class GoogleSearchService {
  maxSearchResults = MAX_SEARCH_RESULTS;
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getGoogleSearchResults(query: string): Promise<GoogleArticle[] | undefined> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`${GOOGLE_SEARCH_BASE_URL}?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle' });

    const results = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a h3')).map((el) => ({
        title: el.textContent,
        link: el.closest('a')?.href,
      }));
      return links.slice(0, this.maxSearchResults);
    });

    await browser.close();
    return results;
  }
}
