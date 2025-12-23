import { startOfDay } from 'date-fns';
import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger, shuffleArray } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { fetchTranscript, getRecentVideos } from '@services/youtube-v3';
import type { Video } from '@services/youtube-v3/types';
import { getAllActiveSubscriptions, getNotifiedVideoIds, markVideoAsNotified, updateSubscription } from '@shared/youtube-follower';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('YoutubeCheckScheduler');

const chatId = MY_USER_ID;

type NextVideoToNotify = {
  readonly video: Video;
  readonly channelId: string;
  readonly channelName: string;
};

async function getNextVideoToNotify(): Promise<NextVideoToNotify | null> {
  logger.log('🔍 Starting getNextVideoToNotify...');
  const subscriptions = await getAllActiveSubscriptions();
  logger.log(`📊 Found ${subscriptions.length} active subscriptions`);

  if (subscriptions.length === 0) {
    logger.log('⚠️ No active subscriptions found, exiting');
    return null;
  }

  const notifiedVideoIds = await getNotifiedVideoIds();
  logger.log(`📝 Already notified video IDs count: ${notifiedVideoIds.size}`);
  const cutoffTime = startOfDay(new Date());
  logger.log(`📅 Cutoff time for videos: ${cutoffTime.toISOString()}`);

  const shuffledSubscriptions = shuffleArray(subscriptions);
  logger.log(`🔀 Shuffled subscriptions, checking ${shuffledSubscriptions.length} channels`);

  for (const subscription of shuffledSubscriptions) {
    try {
      logger.log(`🎥 Checking channel: ${subscription.channelName} (${subscription.channelId})`);
      const recentVideos = await getRecentVideos(subscription.channelId, 3);
      logger.log(`  📹 Found ${recentVideos.length} recent videos for ${subscription.channelName}`);

      const nextVideo = recentVideos
        .filter((video) => new Date(video.publishedAt) >= cutoffTime)
        .filter((video) => !notifiedVideoIds.has(video.id))
        .find((video) => video);

      if (nextVideo) {
        logger.log(`  ✅ Found new video to notify: "${nextVideo.title}" (${nextVideo.id})`);
        return {
          video: nextVideo,
          channelId: subscription.channelId,
          channelName: subscription.channelName,
        };
      } else {
        logger.log(`  ⏭️ No new videos for ${subscription.channelName} (filtered by date/already notified)`);
      }
    } catch (err) {
      logger.error(`  ❌ Failed to check channel ${subscription.channelName}: ${err.message}`);
    }
  }

  logger.log('🔚 No new videos found across all channels');
  return null;
}

export async function youtubeCheck(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  logger.log('🚀 YouTube check started');
  try {
    const nextVideo = await getNextVideoToNotify();

    if (!nextVideo) {
      logger.log('⚠️ No videos to notify');
      return;
    }

    logger.log(`🎬 Processing video: "${nextVideo.video.title}" from ${nextVideo.channelName}`);
    await processVideo(bot, chatbotService, nextVideo.channelName, nextVideo.video);

    logger.log(`💾 Marking video as notified and updating subscription...`);
    await Promise.all([
      markVideoAsNotified(nextVideo.video.id, `https://www.youtube.com/watch?v=${nextVideo.video.id}`),
      updateSubscription(nextVideo.channelId, { lastNotifiedVideoId: nextVideo.video.id }),
    ]);

    logger.log(`✅ Successfully processed video ${nextVideo.video.id}`);
  } catch (err) {
    logger.error(`❌ YouTube check failed: ${err.message}`);
    logger.error(`Stack trace: ${err.stack}`);
  }
}

async function processVideo(bot: TelegramBot, chatbotService: ChatbotService, channelName: string, video: Video): Promise<void> {
  const videoId = video.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.log(`📝 Fetching transcript for video ${videoId}...`);
  let transcript: string;
  try {
    transcript = await fetchTranscript(videoId);

    if (!transcript || transcript.trim().length === 0) {
      logger.log(`⚠️ Video ${videoId} has no transcript, skipping`);
      return;
    }
    logger.log(`✅ Transcript fetched successfully (${transcript.length} characters)`);
  } catch (err) {
    logger.log(`❌ Video ${videoId} transcript fetch failed, skipping: ${err.message}`);
    return;
  }

  const summaryPrompt = `Generate a detailed, comprehensive summary for this YouTube video. Include the key points, main topics, important takeaways, and actionable insights.

**Video Details:**
- Title: ${video.title}
- Channel: ${channelName}
- Published: ${video.publishedAt}

**Transcript:**
${transcript}

**Instructions:**
1. Provide a detailed summary (4-6 sentences) that captures the essence and context of the video
2. List 5-8 key points or main topics covered, with brief explanations for each
3. Include any actionable insights, tips, or recommendations mentioned
4. Highlight important quotes or statements if relevant
5. Make it comprehensive and informative while remaining readable
6. Use Hebrew for the response
7. Format nicely with markdown, bullet points, and emojis for better readability
8. Use section headers if it helps organize the content (e.g., "סיכום", "נקודות מרכזיות", "מסקנות")

DO NOT include any tool calls or ask questions - just provide the detailed summary directly.`;

  logger.log(`🤖 Generating AI summary for video ${videoId}...`);
  const summaryResponse = await chatbotService.processMessage(summaryPrompt, chatId);
  logger.log(`✅ AI summary generated (${summaryResponse.message.length} characters)`);

  const notificationMessage = `📺 *סרטון חדש מ-${channelName}*

🎬 *${video.title}*

${summaryResponse.message}

🔗 [צפה בסרטון](${videoUrl})`;

  logger.log(`📤 Sending notification to chat ${chatId}...`);
  await sendShortenedMessage(bot, chatId, notificationMessage, { parse_mode: 'Markdown' });
  logger.log(`✅ Notification sent successfully`);
}
