import { getTopBy, getUserDetails } from '@shared/wolt';

export async function getWoltSummary(): Promise<string> {
  const topChatIds = await getTopBy('chatId');

  const topUsers = await Promise.all(
    topChatIds.map(async ({ _id, count }) => {
      const user = await getUserDetails(_id);
      const userName = user ? `${user.firstName} ${user.lastName} - ${user.username}` : 'Unknown User';
      return { _id, count, user: userName };
    }),
  );

  const topRestaurants = await getTopBy('restaurant');

  const topUsersText = topUsers.map(({ user, count }, index) => `${index + 1}. ${user} (${count})`).join('\n');
  const topRestaurantsText = topRestaurants.map(({ _id, count }, index) => `${index + 1}. ${_id} (${count})`).join('\n');

  return `Top users this week:\n${topUsersText}\n\nTop restaurants this week:\n${topRestaurantsText}`;
}
