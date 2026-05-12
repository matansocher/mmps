import { deleteFriendById, findFriendByName, getAllFriends } from '@shared/friends';

type HandleRemoveParams = {
  readonly name?: string;
};

export async function handleRemove({ name }: HandleRemoveParams): Promise<string> {
  if (!name?.trim()) {
    return JSON.stringify({ success: false, error: 'A name is required to remove a friend' });
  }

  const match = await findFriendByName(name);

  if (!match || !match._id) {
    const all = await getAllFriends();
    const allNames = all.map((f) => f.name);
    return JSON.stringify({ success: false, error: `No friend named "${name}" found`, currentList: allNames });
  }

  await deleteFriendById(match._id);
  return JSON.stringify({ success: true, message: `${match.name} was removed from the friends list` });
}
