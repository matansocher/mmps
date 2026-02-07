import { getActiveFlightSubscriptionsByChatId } from '@shared/flights-tracker';

export async function handleListSubscriptions(chatId: number): Promise<string> {
  const subscriptions = await getActiveFlightSubscriptionsByChatId(chatId);

  if (subscriptions.length === 0) {
    return JSON.stringify({ success: true, message: 'No active flight subscriptions', subscriptions: [] });
  }

  const list = subscriptions.map((s) => ({
    country: s.countryName,
    emoji: s.countryEmoji,
    subscribedAt: s.createdAt,
  }));

  return JSON.stringify({ success: true, subscriptions: list });
}
