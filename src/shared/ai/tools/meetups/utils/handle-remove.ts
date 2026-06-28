import { deleteMeetFriendById, findMeetFriendByName, getAllMeetFriends } from '@shared/meet-friends';

type HandleRemoveParams = {
  readonly name?: string;
};

export async function handleRemove({ name }: HandleRemoveParams): Promise<string> {
  if (!name?.trim()) {
    return JSON.stringify({ success: false, error: 'A name is required to remove a friend' });
  }

  const match = await findMeetFriendByName(name);

  if (!match || !match._id) {
    const all = await getAllMeetFriends();
    const allNames = all.map((f) => f.name);
    return JSON.stringify({ success: false, error: `No friend named "${name}" found`, currentList: allNames });
  }

  await deleteMeetFriendById(match._id);
  return JSON.stringify({ success: true, message: `${match.name} was removed from the meet list` });
}
