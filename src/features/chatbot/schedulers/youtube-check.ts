import { subHours } from 'date-fns';
import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { fetchTranscript, getRecentVideos } from '@services/youtube-v3';
import type { Video } from '@services/youtube-v3/types';
import { getAllActiveSubscriptions, getNotifiedVideoIds, markVideoAsNotified, Subscription, updateSubscription } from '@shared/youtube-follower';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('YoutubeCheckScheduler');

const chatId = MY_USER_ID;

export async function youtubeCheck(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    logger.log('Starting YouTube check...');

    const subscriptions = await getAllActiveSubscriptions();

    if (subscriptions.length === 0) {
      logger.log('No active subscriptions found');
      return;
    }

    logger.log(`Processing ${subscriptions.length} subscription(s)`);
    const notifiedVideoIds = await getNotifiedVideoIds();
    for (const subscription of subscriptions) {
      try {
        await processSubscription(bot, chatbotService, subscription, notifiedVideoIds);
      } catch (err) {
        logger.error(`Failed to process subscription for channel ${subscription.channelName}: ${err.message}`);
      }
    }

    logger.log('YouTube check completed');
  } catch (err) {
    logger.error(`YouTube check failed: ${err.message}`);
  }
}

async function processSubscription(bot: TelegramBot, chatbotService: ChatbotService, subscription: Subscription, notifiedVideoIds: Set<string>): Promise<void> {
  const { channelId, channelName } = subscription;

  const recentVideos = await getRecentVideos(channelId, 3);

  if (recentVideos.length === 0) {
    logger.log(`No videos found for channel ${channelName}`);
    return;
  }

  const cutoffTime = subHours(new Date(), 8);
  const newVideos = recentVideos.filter((video) => {
    const publishedAt = new Date(video.publishedAt);
    return publishedAt >= cutoffTime;
  });

  if (newVideos.length === 0) {
    logger.log(`No new videos in last 8 hours for channel ${channelName}`);
    return;
  }

  logger.log(`Found ${newVideos.length} new video(s) for channel ${channelName}`);

  for (const video of newVideos) {
    const videoId = video.id;

    if (notifiedVideoIds.has(videoId)) {
      logger.log(`Video ${videoId} already notified`);
      continue;
    }

    try {
      await processVideo(bot, chatbotService, channelName, video);

      await Promise.all([markVideoAsNotified(videoId, `https://www.youtube.com/watch?v=${videoId}`), updateSubscription(channelId, { lastNotifiedVideoId: videoId })]);

      logger.log(`Successfully processed video ${videoId}`);
    } catch (err) {
      logger.error(`Failed to process video ${videoId}: ${err.message}`);
    }
  }
}

async function processVideo(bot: TelegramBot, chatbotService: ChatbotService, channelName: string, video: Video): Promise<void> {
  const videoId = video.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  let transcript: string;
  try {
    transcript = await fetchTranscript(videoId);

    if (!transcript || transcript.trim().length === 0) {
      logger.log(`Video ${videoId} has no transcript, skipping`);
      return;
    }
  } catch (err) {
    logger.log(`Video ${videoId} transcript fetch failed, skipping: ${err.message}`);
    return;
  }

  const summaryPrompt = `Generate a concise summary for this YouTube video. Include the key points, main topics, and important takeaways.

**Video Details:**
- Title: ${video.title}
- Channel: ${channelName}
- Published: ${video.publishedAt}

**Transcript:**
${transcript}

**Instructions:**
1. Provide a brief 2-3 sentence summary of the video
2. List 3-5 key points or main topics covered
3. Keep it concise and informative
4. Use Hebrew for the response
5. Format nicely with markdown and emojis

DO NOT include any tool calls or ask questions - just provide the summary directly.`;

  const summaryResponse = await chatbotService.processMessage(summaryPrompt, chatId);

  const notificationMessage = `📺 *סרטון חדש מ-${channelName}*

🎬 *${video.title}*

${summaryResponse.message}

🔗 [צפה בסרטון](${videoUrl})`;

  await sendShortenedMessage(bot, chatId, notificationMessage, { parse_mode: 'Markdown' });
}
