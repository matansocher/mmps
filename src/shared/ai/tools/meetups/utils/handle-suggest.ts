import { getAllMeetFriends } from '@shared/meet-friends';

export async function handleSuggest(): Promise<string> {
  const meetFriends = await getAllMeetFriends();

  if (meetFriends.length === 0) {
    return JSON.stringify({ success: false, error: 'No friends found in the meet list' });
  }

  const shuffled = [...meetFriends];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const suggested = shuffled.slice(0, 5).map((f) => f.name);

  return JSON.stringify({ success: true, suggestions: suggested });
}
