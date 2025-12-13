import { getSubscription, type Platform } from '@shared/follower';
import { MESSAGES } from '../follower.config';

export async function removeSubscription(chatId: number, channelId: string, platform: Platform): Promise<string> {
  try {
    const subscription = await getSubscription(chatId, channelId, platform);
    if (!subscription) {
      return 'Subscription not found.';
    }

    await removeSubscription(chatId, channelId, platform);
    return `✅ Removed ${subscription.channelName} from your subscriptions.`;
  } catch {
    return MESSAGES.ERROR;
  }
}
