import { CAMPAIGN, CAMPAIGN_VERSION, CHAPTER_IDS, isRoomId, RETAINED_ROOM_IDS, roomNumber } from './campaign';

export type Completion = { readonly stars: number; readonly bestMoves: number | null };
export type Progress = {
  readonly completed: Readonly<Record<number, Completion>>;
  readonly skipped: readonly number[];
  readonly seen: readonly string[];
};
export type SavedRoom = { readonly id: number; readonly signature: string; readonly moves: string };
export type CloudJourney = {
  readonly campaignVersion: typeof CAMPAIGN_VERSION;
  readonly epoch: number;
  readonly revision: number;
  readonly progress: Progress;
  readonly room: SavedRoom | null;
  readonly roomRevision: number;
};
export type SyncRequest = {
  readonly campaignVersion: typeof CAMPAIGN_VERSION;
  readonly epoch: number | null;
  readonly progress: Progress;
  readonly room?: SavedRoom | null;
  readonly roomRevision: number;
};
export type SyncResult = {
  readonly journey: CloudJourney;
  readonly reset: boolean;
  readonly rejectedSkips: readonly number[];
  readonly roomConflict: boolean;
};

export const emptyProgress = (): Progress => ({ completed: {}, skipped: [], seen: [] });
export const emptyCloudJourney = (): CloudJourney => ({ campaignVersion: CAMPAIGN_VERSION, epoch: 0, revision: 0, progress: emptyProgress(), room: null, roomRevision: 0 });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const counter = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function cleared(progress: Progress, id: number): boolean {
  return !!progress.completed[id] || progress.skipped.includes(id);
}

export function skipsEarned(progress: Progress): number {
  return CHAPTER_IDS.filter((chapter) => CAMPAIGN.filter((room) => room.chapter === chapter).every((room) => cleared(progress, room.id))).length * 2;
}

function legacySkipsEarned(progress: Progress): number {
  let earned = progress.completed[5] ? 2 : 0;
  for (let chapter = 0; chapter < 10; chapter++) {
    if (Array.from({ length: 10 }, (_, index) => chapter * 10 + index + 1).every((id) => cleared(progress, id))) earned += 2;
  }
  return earned;
}

export function parseProgress(value: unknown): Progress {
  return parseStoredProgress(value, false);
}

function parseStoredProgress(value: unknown, legacy: boolean): Progress {
  if (!object(value) || !object(value.completed) || !Array.isArray(value.skipped) || !Array.isArray(value.seen)) throw new Error('Invalid campaign progress');
  const validId = legacy ? (id: number) => Number.isInteger(id) && id >= 1 && id <= 100 : isRoomId;
  const completed: Record<number, Completion> = {};
  for (const [key, result] of Object.entries(value.completed)) {
    if (
      !validId(Number(key)) ||
      String(Number(key)) !== key ||
      !object(result) ||
      !counter(result.stars) ||
      result.stars < 1 ||
      result.stars > 3 ||
      (result.bestMoves !== null && (!counter(result.bestMoves) || result.bestMoves < 1))
    )
      throw new Error('Invalid room result');
    completed[Number(key)] = { stars: result.stars, bestMoves: typeof result.bestMoves === 'number' ? result.bestMoves : null };
  }
  const skipped: number[] = [];
  for (const id of value.skipped) {
    if (typeof id !== 'number' || !validId(id) || skipped.includes(id)) throw new Error('Invalid skipped room');
    skipped.push(id);
  }
  const seen: string[] = [];
  for (const id of value.seen) {
    if (typeof id !== 'string' || !/^(skips|concept-(?:[1-9]|10)|reward-(?:[1-9]|10))$/.test(id)) throw new Error('Invalid chapter discovery');
    if (!legacy && id.startsWith('reward-') && !CHAPTER_IDS.includes(Number(id.slice(7)))) throw new Error('Invalid chapter reward');
    if (!seen.includes(id)) seen.push(id);
  }
  const progress = { completed, skipped, seen };
  if ((legacy ? legacySkipsEarned(progress) : skipsEarned(progress)) < skipped.length) throw new Error('Invalid skip balance');
  return progress;
}

export function migrateLegacyProgress(value: unknown): Progress {
  const previous = parseStoredProgress(value, true);
  return {
    completed: Object.fromEntries(Object.entries(previous.completed).filter(([id]) => RETAINED_ROOM_IDS.includes(Number(id)))),
    skipped: [],
    seen: previous.seen.filter((id) => id.startsWith('concept-')),
  };
}

export function parseSavedRoom(value: unknown, maxMoves = 40000): SavedRoom | null {
  if (value === null) return null;
  if (
    !object(value) ||
    typeof value.id !== 'number' ||
    !isRoomId(value.id) ||
    typeof value.signature !== 'string' ||
    value.signature.length > 4096 ||
    typeof value.moves !== 'string' ||
    value.moves.length > maxMoves ||
    !/^(?:[URDL]|I\d{1,4};)*$/.test(value.moves)
  )
    throw new Error('Invalid saved room');
  return { id: value.id, signature: value.signature, moves: value.moves };
}

export function parseSyncRequest(value: unknown): SyncRequest {
  if (!object(value) || value.campaignVersion !== CAMPAIGN_VERSION || (value.epoch !== null && !counter(value.epoch)) || !counter(value.roomRevision)) throw new Error('Invalid sync request');
  return {
    campaignVersion: CAMPAIGN_VERSION,
    epoch: typeof value.epoch === 'number' ? value.epoch : null,
    progress: parseProgress(value.progress),
    roomRevision: value.roomRevision,
    ...('room' in value ? { room: parseSavedRoom(value.room) } : {}),
  };
}

export function parseCloudJourney(value: unknown): CloudJourney {
  if (!object(value) || value.campaignVersion !== CAMPAIGN_VERSION || !counter(value.epoch) || !counter(value.revision) || !counter(value.roomRevision)) throw new Error('Invalid cloud journey');
  return {
    campaignVersion: CAMPAIGN_VERSION,
    epoch: value.epoch,
    revision: value.revision,
    roomRevision: value.roomRevision,
    progress: parseProgress(value.progress),
    room: parseSavedRoom(value.room),
  };
}

export function mergeProgress(saved: Progress, incoming: Progress): { readonly progress: Progress; readonly rejectedSkips: readonly number[] } {
  const completed: Record<number, Completion> = { ...saved.completed };
  for (const [id, result] of Object.entries(incoming.completed)) {
    const previous = completed[Number(id)];
    const bestMoves = Math.min(previous?.bestMoves ?? Infinity, result.bestMoves ?? Infinity);
    completed[Number(id)] = { stars: Math.max(previous?.stars ?? 0, result.stars), bestMoves: Number.isFinite(bestMoves) ? bestMoves : null };
  }
  const seen = [...new Set([...saved.seen, ...incoming.seen])].sort();
  const skipped = [...new Set([...saved.skipped, ...incoming.skipped])].sort((a, b) => roomNumber(a) - roomNumber(b));
  const progress = { completed, skipped, seen };
  const rejectedSkips: number[] = [];
  // Existing server spends win ties. Remove only conflicting new spends, never earned stars.
  while (skipped.length > skipsEarned(progress)) {
    let index = skipped.length - 1;
    while (index >= 0 && saved.skipped.includes(skipped[index])) index--;
    if (index < 0) throw new Error('Stored skip balance is invalid');
    rejectedSkips.push(...skipped.splice(index, 1));
  }
  return { progress, rejectedSkips };
}

export function mergeJourney(saved: CloudJourney, incoming: SyncRequest): SyncResult {
  if ((incoming.epoch ?? 0) !== saved.epoch) return { journey: saved, reset: true, rejectedSkips: [], roomConflict: false };
  const merged = mergeProgress(saved.progress, incoming.progress);
  const roomChanged = incoming.room !== undefined && JSON.stringify(incoming.room) !== JSON.stringify(saved.room);
  const roomConflict = roomChanged && incoming.roomRevision !== saved.roomRevision;
  const room = roomChanged && !roomConflict ? incoming.room : saved.room;
  return {
    journey: {
      ...saved,
      revision: saved.revision + 1,
      progress: merged.progress,
      room: room ?? null,
      roomRevision: saved.roomRevision + Number(roomChanged && !roomConflict),
    },
    reset: false,
    rejectedSkips: merged.rejectedSkips,
    roomConflict,
  };
}
