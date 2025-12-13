import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { getActiveSubscriptions, getUserPreferences, PLATFORM_CONFIG, Subscription } from '@shared/follower';
import { BOT_CONFIG } from './follower.config';
import { getVideoNotificationMessage } from './utils';

export class FollowerSchedulerService {
  private readonly logger = new Logger(FollowerSchedulerService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  init(): void {
    cron.schedule(
      '10 * * * *',
      async () => {
        await this.checkForNewVideos();
      },
      { timezone: DEFAULT_TIMEZONE },
    );

    setTimeout(() => {
      this.checkForNewVideos(); // for testing purposes
    }, 8000);
  }

  private async checkForNewVideos(): Promise<void> {
    const subscriptions = await getActiveSubscriptions();

    for (const subscription of subscriptions) {
      const { platform, channelId, lastNotifiedVideoId, channelName } = subscription;

      try {
        const platformConfig = PLATFORM_CONFIG[platform];
        let newVideos: any[] = [];

        if (lastNotifiedVideoId) {
          newVideos = await platformConfig.getNewVideosSince(channelId, lastNotifiedVideoId, 3);
        } else {
          const allVideos = await platformConfig.getNewVideosSince(channelId, '', 1);
          newVideos = allVideos.slice(0, 1);
        }

        if (newVideos.length === 0) {
          this.logger.log(`No new videos for ${channelName}`);
          return;
        }

        this.logger.log(`Found ${newVideos.length} new videos for ${channelName}`);

        for (const video of newVideos.reverse()) {
          await this.notifyNewVideo(video, subscription);
        }
      } catch (err) {
        this.logger.error(`Error checking subscription for ${channelName}: ${err}`);
      }
    }
  }

  private async notifyNewVideo(video: any, subscription: Subscription): Promise<void> {
    try {
      const userPreferences = await getUserPreferences(subscription.chatId);

      if (!userPreferences?.isNotificationsEnabled) {
        this.logger.log(`Notifications disabled for chat ${subscription.chatId}, skipping video ${video.id}`);
        return;
      }

      const message = await getVideoNotificationMessage(video, subscription);

      if (message) {
        await this.bot.sendMessage(subscription.chatId, message);
        this.logger.log(`Notified chat ${subscription.chatId} about video ${video.id}`);
      }
    } catch (err) {
      this.logger.error(`Error notifying video ${video.id}: ${err}`);
    }
  }
}
