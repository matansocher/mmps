import { addFriend, findFriendByName } from '@shared/friends';

type HandleAddParams = {
  readonly name?: string;
};

export async function handleAdd({ name }: HandleAddParams): Promise<string> {
  if (!name?.trim()) {
    return JSON.stringify({ success: false, error: 'A name is required to add a friend' });
  }

  const existing = await findFriendByName(name);
  if (existing) {
    return JSON.stringify({ success: false, error: `${name} is already in the friends list` });
  }

  await addFriend({ name: name.trim() });
  return JSON.stringify({ success: true, message: `${name} was added to the friends list` });
}
