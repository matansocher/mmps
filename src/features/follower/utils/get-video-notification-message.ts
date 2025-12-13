import { isVideoNotified, markVideoAsNotified, PLATFORM_CONFIG, Subscription, updateSubscription } from '@shared/follower';
import { VideoNotification } from '../types';
import { formatVideoMessage } from './format-video-message';

export async function getVideoNotificationMessage(video: any, subscription: Subscription): Promise<string | null> {
  const { chatId, platform, channelId, channelName } = subscription;

  try {
    const alreadyNotified = await isVideoNotified(chatId, video.id, platform);
    if (alreadyNotified) {
      return null;
    }

    const platformConfig = PLATFORM_CONFIG[platform];

    let summary: string | undefined;
    try {
      const transcriptText = await platformConfig.getTranscript(video.url);

      if (transcriptText) {
        summary = await this.generateSummary(transcriptText);
      }
    } catch {}

    const notification: VideoNotification = {
      videoUrl: video.url,
      title: platformConfig.getVideoTitle(video),
      description: platformConfig.getVideoDescription(video),
      summary,
      platform,
      channelName,
      publishedAt: platformConfig.getVideoPublishedAt(video),
    };

    await markVideoAsNotified(chatId, video.id, platform, video.url);

    await updateSubscription(chatId, channelId, platform, { lastNotifiedVideoId: video.id });

    return formatVideoMessage(notification);
  } catch {
    return null;
  }
}
