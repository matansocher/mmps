import { TWITTER_CLIENT_TOKEN } from '@services/twitter-client/twitter-client.config';
import { env } from 'node:process';
import { TwitterApi } from 'twitter-api-v2';
import { Module, DynamicModule, Global } from '@nestjs/common';

@Global()
@Module({})
export class TwitterClientFactoryModule {
  static forChild(): DynamicModule {
    const TwitterClientProvider = {
      provide: TWITTER_CLIENT_TOKEN,
      useFactory: async (): Promise<TwitterApi> => {
        return new TwitterApi({
          appKey: env.TWITTER_APP_KEY,
          appSecret: env.TWITTER_APP_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        });
      },
    };

    return {
      module: TwitterClientFactoryModule,
      providers: [TwitterClientProvider],
      exports: [TwitterClientProvider],
    };
  }
}
