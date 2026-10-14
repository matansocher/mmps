import { subDays } from 'date-fns';
import { getTopBy, getUserDetails } from '@shared/wolt';

const SUMMARY_DAYS = 7;

export async function getWoltSummary(): Promise<string> {
  const since = subDays(new Date(), SUMMARY_DAYS);
  const [topChatIds, topRestaurants] = await Promise.all([getTopBy('chatId', since), getTopBy('restaurant', since)]);

  const topUsers = await Promise.all(
    topChatIds.map(async ({ _id, count }) => {
      const user = await getUserDetails(_id);
      return { count, user: formatUserName(user) };
    }),
  );

  const topUsersText = topUsers.map(({ user, count }, index) => `${index + 1}. ${user} (${count})`).join('\n') || 'No alerts';
  const topRestaurantsText = topRestaurants.map(({ _id, count }, index) => `${index + 1}. ${_id} (${count})`).join('\n') || 'No alerts';

  return `Top users in the last ${SUMMARY_DAYS} days:\n${topUsersText}\n\nTop restaurants in the last ${SUMMARY_DAYS} days:\n${topRestaurantsText}`;
}

function formatUserName(user: { readonly firstName?: string; readonly lastName?: string; readonly username?: string } | null): string {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return [fullName, user?.username].filter(Boolean).join(' - ') || 'Unknown User';
}
