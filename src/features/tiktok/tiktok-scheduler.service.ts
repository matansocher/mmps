import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { sleep } from '@core/utils';
import { getChatCompletion } from '@services/anthropic';
import { getFollowedChannels } from '@shared/tiktok/mongo/channel.repository';
import { addVideo, getVideos } from '@shared/tiktok/mongo/video.repository';
import { BOT_CONFIG, SUMMARY_PROMPT } from './tiktok.config';
import { getTikTokTranscript, getTikTokUserVideos } from './utils';

const SMART_REMINDER_HOUR_OF_DAY = 20;

@Injectable()
export class TiktokSchedulerService implements OnModuleInit {
  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    setTimeout(() => {
      this.handleEODReminder(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'tiktok-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleEODReminder(): Promise<void> {
    const channels = await getFollowedChannels();
    for (const channel of channels) {
      const videos = await getTikTokUserVideos(channel.username);
      const todayDateFormat = new Date().toISOString().split('T')[0];
      const todayVideos = videos.filter((video) => todayDateFormat === video.uploadDate);
      const viewedVideos = await getVideos();
      const newVideos = todayVideos.filter((video) => !viewedVideos.find((v) => v.videoId === video.id));
      if (!newVideos.length) {
        continue;
      }

      for (const video of newVideos) {
        const videoUrl = `https://www.tiktok.com/@${channel.username}/video/${video.id}`;
        const videoTranscript = await getTikTokTranscript(channel.username, video.id, channel.lang || 'en');
        const transcriptSummary = await getChatCompletion(SUMMARY_PROMPT, `Please Summarize this video text: ${videoTranscript.text}`);
        const textContent = transcriptSummary.content
          .filter((c) => c.type === 'text')
          .map((c) => (c as any).text)
          .join(' ');
        const message = `New videos from @${channel.username}: ${videoUrl}\n\n${textContent}`;

        await this.bot.sendMessage(MY_USER_ID, message);
        await addVideo(video.id);
      }

      await sleep(1000);
    }
  }
}
