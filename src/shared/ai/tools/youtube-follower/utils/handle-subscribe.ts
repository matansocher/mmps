import { getChannelIdFromHandle, getRecentVideos } from '@services/youtube-v3';
import { createSubscription, getSubscription } from '@shared/youtube-follower';
import { extractChannelIdentifier } from './extract-channel-identifier';

export async function handleSubscribe(channelIdentifier: string): Promise<string> {
  if (!channelIdentifier) {
    return JSON.stringify({ success: false, error: 'Channel identifier is required for subscribe action' });
  }

  try {
    const cleanIdentifier = extractChannelIdentifier(channelIdentifier);

    const channelId = await getChannelIdFromHandle(cleanIdentifier);

    const existingSubscription = await getSubscription(channelId);
    if (existingSubscription) {
      return JSON.stringify({
        success: false,
        error: `Already subscribed to ${existingSubscription.channelName}`,
        channel: {
          name: existingSubscription.channelName,
          handle: existingSubscription.channelHandle,
          url: existingSubscription.channelUrl,
        },
      });
    }

    const recentVideos = await getRecentVideos(channelId, 1);
    if (recentVideos.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Could not fetch channel information. Channel may not have any videos.',
      });
    }

    const channelName = recentVideos[0].channelTitle;
    const channelHandle = cleanIdentifier.startsWith('@') ? cleanIdentifier : undefined;

    await createSubscription({ channelId, channelName, channelHandle, channelUrl: `https://www.youtube.com/channel/${channelId}` });

    return JSON.stringify({
      success: true,
      message: `Successfully subscribed to ${channelName}`,
      channel: {
        name: channelName,
        handle: channelHandle,
        url: `https://www.youtube.com/channel/${channelId}`,
      },
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: `Failed to subscribe: ${err.message}`,
    });
  }
}
