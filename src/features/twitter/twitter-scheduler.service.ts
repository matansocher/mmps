import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { provideTelegramBot } from '@services/telegram';
import { getUserTweets } from '@services/twitter';
import { getAllActiveSubscriptions, updateLastFetched } from '@shared/twitter';
import { BOT_CONFIG } from './twitter.config';
import { TwitterService } from './twitter.service';

@Injectable()
export class TwitterSchedulerService {
  private readonly logger = new Logger(TwitterSchedulerService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly twitterService: TwitterService) {}

  @Cron('0 18 * * *', { name: 'twitter-daily-tweets', timeZone: DEFAULT_TIMEZONE })
  async handleDailyTweetsFetch(): Promise<void> {
    this.logger.log('Starting daily tweets fetch...');

    try {
      const subscriptions = await getAllActiveSubscriptions();

      if (subscriptions.length === 0) {
        this.logger.log('No active subscriptions found');
        return;
      }

      this.logger.log(`Found ${subscriptions.length} subscriptions to process`);

      // Group subscriptions by chatId to send to the right user
      const subscriptionsByChat = subscriptions.reduce(
        (acc, sub) => {
          if (!acc[sub.chatId]) {
            acc[sub.chatId] = [];
          }
          acc[sub.chatId].push(sub);
          return acc;
        },
        {} as Record<number, typeof subscriptions>,
      );

      // Process each chat's subscriptions
      for (const [chatId, chatSubscriptions] of Object.entries(subscriptionsByChat)) {
        const chatIdNum = parseInt(chatId, 10);

        for (const subscription of chatSubscriptions) {
          try {
            this.logger.log(`Fetching tweets for @${subscription.username} (chatId: ${chatIdNum})`);

            const tweets = await getUserTweets(subscription.twitterUserId, 1);

            if (tweets.length === 0) {
              this.logger.log(`No tweets found for @${subscription.username} in the last 24 hours`);
              await this.bot.sendMessage(chatIdNum, `📭 No new tweets from @${subscription.username} in the last 24 hours.`);
            } else {
              this.logger.log(`Found ${tweets.length} tweets for @${subscription.username}`);

              const verifiedBadge = subscription.verified ? '✓ ' : '';
              const header = `🐦 Latest tweets from ${verifiedBadge}@${subscription.username} (${tweets.length} tweet${tweets.length > 1 ? 's' : ''}):\n\n`;

              await this.bot.sendMessage(chatIdNum, header);

              // Send each tweet as a separate message for better readability
              for (const tweet of tweets.slice(0, 10)) {
                // Limit to 10 tweets max
                const formattedTweet = this.twitterService.formatTweet(tweet, subscription.username);
                await this.bot.sendMessage(chatIdNum, formattedTweet);

                // Small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              if (tweets.length > 10) {
                await this.bot.sendMessage(chatIdNum, `... and ${tweets.length - 10} more tweet${tweets.length - 10 > 1 ? 's' : ''}`);
              }
            }

            await updateLastFetched(subscription.twitterUserId);
          } catch (error) {
            this.logger.error(`Failed to fetch tweets for @${subscription.username}: ${error.message}`);
            await this.bot.sendMessage(chatIdNum, `❌ Failed to fetch tweets from @${subscription.username}: ${error.message}`);
          }
        }
      }

      this.logger.log('Daily tweets fetch completed successfully');
    } catch (error) {
      this.logger.error(`Daily tweets fetch failed: ${error.message}`, error.stack);
    }
  }
}
