// import puppeteer from 'puppeteer';
import { TwitterApi } from 'twitter-api-v2';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { TWITTER_CLIENT_TOKEN } from '@services/twitter-client/twitter-client.config';

@Injectable()
export class TwitterClientService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    @Inject(TWITTER_CLIENT_TOKEN) private readonly twitterClient: TwitterApi,
  ) {}

  // currently not working - twitter demands you to pay 100$ so you can read users tweets
  onModuleInit(): any {
    const username = 'BrandonButch';
    this.getUserTweets(username, 10);
  }

  async getUserTweets(username: string, count: number = 10) {
    const user = await this.twitterClient.v2.userByUsername(username);
    const userId = user.data.id;

    // Fetch the tweets from the specific user
    const tweets = await this.twitterClient.v2.userTimeline(userId, {
      max_results: count,
      'tweet.fields': ['created_at', 'text'], // Fetch only needed fields
    });

    return tweets.data;
    // return this.getUserTimeline(userId, count);
  }

  // async getUserTimeline(userId: string, count: number = 10) {
  //   try {
  //     const url = `https://x.com/${userId}`;
  //
  //     // Launch Puppeteer browser
  //     // const browser = await puppeteer.launch({ headless: true });
  //     const browser = await puppeteer.launch({
  //       headless: false, // Set to false to open a visible browser window
  //       slowMo: 50,      // Slow down operations by 50ms for better visibility
  //       args: ['--window-size=1280,800'] // Optional: set a specific window size
  //     });
  //
  //     const page = await browser.newPage();
  //
  //     // Navigate to the user's page
  //     await page.goto(url, { waitUntil: 'networkidle2' });
  //
  //     // Wait for the tweets to load (you can adjust this selector)
  //     // await page.waitForSelector('[data-testid="tweet"]');
  //     await page.waitForSelector('[aria-label="Profile timelines"]');
  //
  //     // Extract the tweets
  //     const tweets = await page.evaluate(() => {
  //       const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
  //       const tweetArray = Array.from(tweetElements);
  //       return tweetArray.map((tweet) => tweet.textContent);
  //     });
  //     return tweets;
  //   } catch (err) {
  //     throw err;
  //   }
  // }
}
