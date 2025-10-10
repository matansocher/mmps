import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { getResponse } from '@services/openai';
import { getTikTokTranscript } from '@services/tiktok';
import { TIKTOK_BASE_URL } from '@services/tiktok/constants';
import { addVideo, Channel } from '@shared/tiktok';
import { SUMMARY_PROMPT } from '../tiktok.config';

export const VideoSummarySchema = z.object({
  summary: z.string().max(4095).describe('A comprehensive summary of the video transcript, covering the main points and concepts learned'),
  description: z.string().max(200).describe('A short description of the video content, suitable for use as a caption or brief overview.'),
});

export type ProcessChannelOptions = {
  readonly bot: TelegramBot;
  readonly chatId: number;
  readonly channel: Channel;
  readonly maxVideos?: number;
};

export type ProcessedVideo = {
  readonly id: string;
  readonly url: string;
  readonly username: string;
  readonly summary: string;
  readonly description: string;
};

type ProcessSingleVideoOptions = {
  readonly bot: TelegramBot;
  readonly chatId: number;
  readonly username: string;
  readonly videoId: string;
  readonly videoUrl?: string;
};

export async function processSingleVideo(options: ProcessSingleVideoOptions): Promise<ProcessedVideo> {
  const { bot, chatId, username, videoId, videoUrl } = options;

  const finalVideoUrl = videoUrl || `${TIKTOK_BASE_URL}/@${username}/video/${videoId}`;

  const videoTranscript = await getTikTokTranscript(username, videoId);

  const { result: summaryDetails } = await getResponse<typeof VideoSummarySchema>({
    instructions: SUMMARY_PROMPT,
    input: `Please Summarize this video text: ${videoTranscript.text}`,
    schema: VideoSummarySchema,
  });

  const message = [`New video from @${username}\n${finalVideoUrl}`, `📝 ${summaryDetails.description}`, `📖 Summary:\n${summaryDetails.summary}`].join('\n\n');

  await bot.sendMessage(chatId, message);

  await addVideo(videoId);

  return {
    id: videoId,
    url: finalVideoUrl,
    username,
    summary: summaryDetails.summary,
    description: summaryDetails.description,
  };
}
