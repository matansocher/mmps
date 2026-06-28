import { addMeetFriend, findMeetFriendByName } from '@shared/meet-friends';

type HandleAddParams = {
  readonly name?: string;
};

export async function handleAdd({ name }: HandleAddParams): Promise<string> {
  if (!name?.trim()) {
    return JSON.stringify({ success: false, error: 'A name is required to add a friend' });
  }

  const existing = await findMeetFriendByName(name);
  if (existing) {
    return JSON.stringify({ success: false, error: `${name} is already in the meet list` });
  }

  await addMeetFriend({ name: name.trim() });
  return JSON.stringify({ success: true, message: `${name} was added to the meet list` });
}
