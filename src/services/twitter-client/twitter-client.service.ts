// import puppeteer from 'puppeteer';
import { TwitterApi } from 'twitter-api-v2';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { ScrapingService } from '@services/scraping/scraping.service';
import { TWITTER_CLIENT_TOKEN } from './twitter-client.config';

@Injectable()
export class TwitterClientService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly scrapingService: ScrapingService,
    @Inject(TWITTER_CLIENT_TOKEN) private readonly twitterClient: TwitterApi,
  ) {}

  // currently not working - twitter demands you to pay 100$ so you can read users tweets
  onModuleInit(): any {
    const username = 'BrandonButch';
    this.getUserTweets(username, 10);
  }

  async getUserTweets(username: string, count: number = 10) {
    // const user = await this.twitterClient.v2.userByUsername(username);
    // const userId = user.data.id;

    const userPage = await this.scrapingService.getArticleContent(`https://x.com/${username}`);

    return userPage;
    // Extract the tweets
    // const tweets = await page.evaluate(() => {
    //   const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
    //   const tweetArray = Array.from(tweetElements);
    //   return tweetArray.map((tweet) => tweet.textContent);
    // });
    // return tweets;
  }
}
