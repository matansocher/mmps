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

  // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ currently not working - twitter demands you to pay 100$ so you can read users tweets
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
  }
}
