import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { sleep } from '@core/utils';
import { getResponse } from '@services/openai';
import { fetchUserVideos, getTikTokTranscript } from '@services/tiktok';
import { addVideo, Channel, getFollowedChannels, getVideos } from '@shared/tiktok';
import { BOT_CONFIG, SUMMARY_PROMPT } from './tiktok.config';

const SMART_REMINDER_HOUR_OF_DAY = 20;

export const VideoSummarySchema = z.object({
  summary: z.string().max(4095).describe('A comprehensive summary of the video transcript, covering the main points and concepts learned'),
  description: z.string().max(200).describe('A short description of the video content, suitable for use as a caption or brief overview.'),
});

@Injectable()
export class TiktokSchedulerService implements OnModuleInit {
  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    setTimeout(() => {
      this.dailyVideoDigest(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'tiktok-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async dailyVideoDigest(): Promise<void> {
    const channels = await getFollowedChannels();
    for (const channel of channels) {
      await this.handleChannel(channel);
      await sleep(1000);
    }
  }

  private async handleChannel(channel: Channel): Promise<void> {
    const { videos } = await fetchUserVideos(channel.username, 5).catch(() => ({ videos: [] }));
    if (!videos.length) {
      return;
    }
    const viewedVideos = await getVideos();
    const newVideos = videos.filter((video) => !viewedVideos.find((v) => v.videoId === video.id));

    if (!newVideos.length) {
      return;
    }

    for (const video of newVideos) {
      await this.handleVideo(channel.username, video);
    }
  }

  private async handleVideo(username: string, video: { id: string; url?: string }): Promise<void> {
    const videoUrl = `https://www.tiktok.com/@${username}/video/${video.id}`;
    const videoTranscript = await getTikTokTranscript(username, video.id);

    const { result: summaryDetails } = await getResponse<typeof VideoSummarySchema>({
      instructions: SUMMARY_PROMPT,
      input: `Please Summarize this video text: ${videoTranscript.text}`,
      schema: VideoSummarySchema,
    });

    const message = [`New video from @${username}\n${videoUrl}`, `📝 ${summaryDetails.description}`, `📖 Summary:\n${summaryDetails.summary}`].join('\n\n');

    await this.bot.sendMessage(MY_USER_ID, message);
    await addVideo(video.id);
  }
}
