import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { getActiveSubscriptions, getNotifiedVideoIds, PLATFORM_CONFIG, Subscription } from '@shared/follower';
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
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const subscription of subscriptions) {
      const { platform, channelId, channelName, chatId } = subscription;

      try {
        const platformConfig = PLATFORM_CONFIG[platform];

        const allVideos = await platformConfig.getNewVideosSince(channelId, '', 5);

        if (allVideos.length === 0) {
          this.logger.log(`No videos found for ${channelName}`);
          continue;
        }

        const recentVideos = allVideos.filter((video) => platformConfig.getVideoTimestamp(video) >= oneDayAgo);

        if (recentVideos.length === 0) {
          this.logger.log(`No videos from last 24 hours for ${channelName}`);
          continue;
        }

        const notifiedVideoIds = await getNotifiedVideoIds(chatId, platform);
        const unnotifiedVideos = recentVideos.filter((video) => !notifiedVideoIds.has(video.id));

        if (unnotifiedVideos.length === 0) {
          this.logger.log(`No new videos for ${channelName}`);
          continue;
        }

        const sortedVideos = unnotifiedVideos.sort((a, b) => platformConfig.getVideoTimestamp(b) - platformConfig.getVideoTimestamp(a));

        const latestVideos = sortedVideos.slice(0, 3);

        this.logger.log(`Found ${latestVideos.length} new videos for ${channelName}`);

        for (const video of latestVideos.reverse()) {
          await this.notifyNewVideo(video, subscription);
        }
      } catch (err) {
        this.logger.error(`Error checking subscription for ${channelName}: ${err}`);
      }
    }
  }

  private async notifyNewVideo(video: any, subscription: Subscription): Promise<void> {
    try {
      const message = await getVideoNotificationMessage(video, subscription);

      if (message) {
        const platformConfig = PLATFORM_CONFIG[subscription.platform];
        const thumbnailUrl = platformConfig.getVideoThumbnail(video);

        if (thumbnailUrl) {
          await this.bot.sendPhoto(subscription.chatId, thumbnailUrl, { caption: message });
        } else {
          await this.bot.sendMessage(subscription.chatId, message);
        }

        this.logger.log(`Notified chat ${subscription.chatId} about video ${video.id}`);
      }
    } catch (err) {
      this.logger.error(`Error notifying video ${video.id}: ${err}`);
    }
  }
}
