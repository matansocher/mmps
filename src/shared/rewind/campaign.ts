export const CAMPAIGN_VERSION = 2;
export type CampaignRoom = {
  readonly id: number;
  readonly chapter: number;
  readonly introduction?: number;
};

// IDs belong to puzzles, not positions. A redesigned puzzle must receive a new ID.
export const CAMPAIGN: readonly CampaignRoom[] = [
  { id: 1, chapter: 1, introduction: 1 },
  { id: 11, chapter: 1, introduction: 2 },
  { id: 101, chapter: 1 },
  { id: 102, chapter: 1 },
  { id: 21, chapter: 3, introduction: 3 },
  { id: 103, chapter: 3 },
  { id: 201, chapter: 4, introduction: 4 },
  { id: 202, chapter: 4 },
  { id: 203, chapter: 4 },
  { id: 204, chapter: 4 },
  { id: 205, chapter: 5, introduction: 5 },
  { id: 206, chapter: 5 },
  { id: 207, chapter: 5 },
  { id: 208, chapter: 5 },
  { id: 209, chapter: 6, introduction: 6 },
  { id: 210, chapter: 6 },
  { id: 211, chapter: 6 },
  { id: 212, chapter: 6 },
  { id: 213, chapter: 6 },
  { id: 214, chapter: 7, introduction: 7 },
  { id: 215, chapter: 7 },
  { id: 216, chapter: 7 },
  { id: 217, chapter: 7 },
  { id: 218, chapter: 8, introduction: 8 },
  { id: 219, chapter: 8 },
  { id: 220, chapter: 8 },
  { id: 221, chapter: 8 },
  { id: 222, chapter: 8 },
  { id: 223, chapter: 9, introduction: 9 },
  { id: 224, chapter: 9 },
  { id: 225, chapter: 9 },
  { id: 226, chapter: 9 },
  { id: 227, chapter: 9 },
  { id: 228, chapter: 10, introduction: 10 },
  { id: 229, chapter: 10 },
  { id: 230, chapter: 10 },
  { id: 231, chapter: 10 },
  { id: 234, chapter: 10 },
];
export const CHAPTER_IDS: readonly number[] = [...new Set(CAMPAIGN.map((room) => room.chapter))];
export const RETAINED_ROOM_IDS: readonly number[] = [1, 11, 21];
export const isRoomId = (id: number): boolean => CAMPAIGN.some((room) => room.id === id);

export function roomNumber(id: number): number {
  const index = CAMPAIGN.findIndex((room) => room.id === id);
  if (index < 0) throw new Error(`Unknown Rewind room: ${id}`);
  return index + 1;
}
