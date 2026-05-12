import { getAllFriends } from '@shared/friends';

export async function handleList(): Promise<string> {
  const friends = await getAllFriends();

  if (friends.length === 0) {
    return JSON.stringify({ success: true, friends: [] });
  }

  return JSON.stringify({ success: true, friends: friends.map((f) => ({ id: f._id?.toString(), name: f.name })) });
}
