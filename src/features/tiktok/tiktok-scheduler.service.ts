import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { sleep } from '@core/utils';
import { getFollowedChannels } from '@shared/tiktok';
import { BOT_CONFIG } from './tiktok.config';
import { processChannelVideos } from './utils';

@Injectable()
export class TiktokSchedulerService implements OnModuleInit {
  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.dailyVideoDigest(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 20 * * *`, { name: 'tiktok-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async dailyVideoDigest(): Promise<void> {
    const channels = await getFollowedChannels();
    for (const channel of channels) {
      await processChannelVideos({ bot: this.bot, chatId: MY_USER_ID, channel });
      await sleep(1000);
    }
  }
}
