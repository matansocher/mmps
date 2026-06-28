import { getAllMeetFriends } from '@shared/meet-friends';

export async function handleList(): Promise<string> {
  const meetFriends = await getAllMeetFriends();

  if (meetFriends.length === 0) {
    return JSON.stringify({ success: true, friends: [] });
  }

  return JSON.stringify({ success: true, friends: meetFriends.map((f) => ({ id: f._id?.toString(), name: f.name })) });
}
