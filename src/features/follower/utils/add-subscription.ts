import { createSubscription, CreateSubscriptionData, getSubscription, PLATFORM_CONFIG } from '@shared/follower';
import { MESSAGES } from '../follower.config';
import { parseAndValidateUrl } from './parse-and-validate-url';

export async function addSubscription(chatId: number, url: string): Promise<string> {
  try {
    const parsed = await parseAndValidateUrl(url);
    if (!parsed.isValid) {
      return parsed.error === 'Channel not found' ? MESSAGES.CHANNEL_NOT_FOUND : MESSAGES.INVALID_URL;
    }

    const existing = await getSubscription(chatId, parsed.channelId, parsed.platform);
    if (existing) {
      return MESSAGES.ALREADY_SUBSCRIBED;
    }

    const platformConfig = PLATFORM_CONFIG[parsed.platform];
    const channelInfo = await platformConfig.getChannelInfo(parsed.channelId);
    const channelName = platformConfig.getChannelName(channelInfo);

    const data: CreateSubscriptionData = {
      chatId,
      platform: parsed.platform,
      channelId: parsed.channelId,
      channelName,
      channelUrl: url,
    };

    await createSubscription(data);
    return [`✅ Successfully added ${channelName} channel from ${parsed.platform}!`, `This channel has ${channelInfo.followerCount} followers`, `I'll notify you when new videos are posted.`].join(
      '\n\n',
    );
  } catch {
    return MESSAGES.ERROR;
  }
}
