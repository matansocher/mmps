import { CAMPAIGN, CAMPAIGN_VERSION, isRoomId, roomNumber } from './campaign';
import { emptyCloudJourney, emptyProgress, mergeJourney, mergeProgress, migrateLegacyProgress, parseCloudJourney, parseProgress, parseSavedRoom, parseSyncRequest, skipsEarned } from './progress';
import type { Progress } from './progress';

const solved = (...ids: number[]): Progress => ({ ...emptyProgress(), completed: Object.fromEntries(ids.map((id) => [id, { stars: 2, bestMoves: 10 }])) });

describe('Rewind cloud progress', () => {
  test('unions rooms and discoveries, retaining best stars and shortest routes', () => {
    const left: Progress = { ...solved(1, 11), seen: ['concept-1'], completed: { ...solved(1).completed, 11: { stars: 3, bestMoves: 7 } } };
    const right: Progress = { ...solved(11, 101), seen: ['skips'], completed: { ...solved(101).completed, 11: { stars: 2, bestMoves: 9 } } };
    expect(mergeProgress(left, right).progress).toEqual({
      completed: { 1: { stars: 2, bestMoves: 10 }, 11: { stars: 3, bestMoves: 7 }, 101: { stars: 2, bestMoves: 10 } },
      seen: ['concept-1', 'skips'],
      skipped: [],
    });
    expect(mergeProgress(right, left).progress).toEqual(mergeProgress(left, right).progress);
  });
  test('preserves an unknown migrated move count until an actual result exists', () => {
    const saved: Progress = { ...emptyProgress(), completed: { 1: { stars: 1, bestMoves: null } } };
    expect(mergeProgress(saved, saved).progress.completed[1].bestMoves).toEqual(null);
    expect(mergeProgress(saved, solved(1)).progress.completed[1].bestMoves).toEqual(10);
  });
  test('the shared reward ledger uses actual chapter membership, never numeric ID ranges', () => {
    expect(skipsEarned(solved(1, 11, 101))).toEqual(0);
    expect(skipsEarned(solved(1, 11, 101, 102))).toEqual(2);
    expect(skipsEarned(solved(1, 11, 101, 102, 21, 103))).toEqual(4);
    expect(isRoomId(101)).toEqual(true);
    expect(isRoomId(2)).toEqual(false);
    expect(roomNumber(101)).toEqual(3);
    expect(roomNumber(21)).toEqual(5);
    expect(roomNumber(201)).toEqual(7);
    expect(roomNumber(234)).toEqual(38);
    expect(skipsEarned(solved(...CAMPAIGN.map(({ id }) => id)))).toEqual(18);
    expect(() => roomNumber(27)).toThrow();
  });
  test('conflicting spends cannot exceed rewards; existing server spends and earned stars survive', () => {
    const saved: Progress = { ...solved(1, 11, 101, 102), skipped: [21, 103] };
    const incoming: Progress = { ...solved(1, 11, 101, 102), skipped: [1, 11, 101, 102] };
    const result = mergeProgress(saved, incoming);
    expect(result.rejectedSkips).toEqual([102, 101]);
    expect(result.progress.skipped).toEqual([1, 11, 21, 103]);
    expect(result.progress.completed).toEqual(saved.completed);
    expect(skipsEarned(result.progress) - result.progress.skipped.length).toEqual(0);
  });
  test('clearing a shorter chapter allows legitimate spends without duplicate rewards', () => {
    const saved = solved(1, 11, 101, 102);
    const result = mergeProgress(saved, { ...saved, skipped: [21, 103] });
    expect(result.rejectedSkips).toEqual([]);
    expect(skipsEarned(result.progress)).toEqual(4);
    expect(mergeProgress(result.progress, result.progress).progress).toEqual(result.progress);
  });
  test('an additive release preserves the six-room cloud save and merges new rooms without losing its attempt', () => {
    const progress: Progress = { ...solved(1, 11, 101, 102, 21, 103), seen: ['concept-1', 'concept-2', 'concept-3', 'reward-1', 'reward-3', 'skips'] };
    const room = { id: 103, signature: 'unchanged-map', moves: 'RRL' };
    const previous = { campaignVersion: 2, epoch: 3, revision: 8, progress, room, roomRevision: 4 };
    const saved = parseCloudJourney(previous);
    expect(saved).toEqual(previous);
    expect(skipsEarned(saved.progress)).toEqual(4);
    const result = mergeJourney(saved, parseSyncRequest({ campaignVersion: 2, epoch: 3, progress: solved(201, 202), roomRevision: 0 }));
    expect(result.roomConflict).toEqual(false);
    expect(result.journey.room).toEqual(room);
    expect(result.journey.roomRevision).toEqual(4);
    expect(result.journey.progress.completed).toEqual({ ...progress.completed, ...solved(201, 202).completed });
    expect([...result.journey.progress.seen].sort()).toEqual([...progress.seen].sort());
    expect(skipsEarned(result.journey.progress)).toEqual(4);
    expect(parseCloudJourney(result.journey)).toEqual(result.journey);
  });
  test('a stale device cannot resurrect progress after a shared reset', () => {
    const saved = { ...emptyCloudJourney(), epoch: 2 };
    for (const epoch of [null, 0, 1]) {
      const result = mergeJourney(saved, { campaignVersion: CAMPAIGN_VERSION, epoch, progress: solved(1, 11), roomRevision: 0 });
      expect(result.reset).toEqual(true);
      expect(result.journey).toEqual(saved);
    }
  });
  test('checkpoint conflicts do not overwrite the newer room or lose stars', () => {
    const room = { id: 1, signature: 'a', moves: 'RR' };
    const saved = { ...emptyCloudJourney(), room, roomRevision: 2 };
    const result = mergeJourney(saved, { campaignVersion: CAMPAIGN_VERSION, epoch: 0, progress: solved(11), roomRevision: 1, room: { ...room, moves: 'L' } });
    expect(result.roomConflict).toEqual(true);
    expect(result.journey.room).toEqual(room);
    expect(result.journey.progress.completed[11].stars).toEqual(2);
    expect(result.journey.roomRevision).toEqual(2);
  });
  test('identical checkpoint retries are idempotent and polls leave the room alone', () => {
    const room = { id: 1, signature: 'a', moves: 'R' };
    const saved = { ...emptyCloudJourney(), room, roomRevision: 2 };
    for (const update of [{}, { room }]) {
      const result = mergeJourney(saved, { campaignVersion: CAMPAIGN_VERSION, epoch: 0, progress: emptyProgress(), roomRevision: 1, ...update });
      expect(result.roomConflict).toEqual(false);
      expect(result.journey.roomRevision).toEqual(2);
    }
  });
  test('old edition achievements migrate only to unchanged puzzles, never new puzzles or rewards', () => {
    const legacy = { ...solved(1, 2, 5, 11, 21, 27), skipped: [6], seen: ['concept-1', 'concept-2', 'reward-1', 'skips'] };
    const migrated = migrateLegacyProgress(legacy);
    expect(migrated).toEqual({ ...solved(1, 11, 21), seen: ['concept-1', 'concept-2'] });
    expect(parseProgress(migrated)).toEqual(migrated);
    expect(legacy.skipped).toEqual([6]);
  });
  test.each([
    { ...emptyProgress(), completed: { 2: { stars: 1, bestMoves: 1 } } },
    { ...emptyProgress(), completed: { 1: { stars: 4, bestMoves: 1 } } },
    { ...emptyProgress(), completed: { '01': { stars: 1, bestMoves: 1 } } },
    { ...emptyProgress(), skipped: [11] },
    { ...solved(1, 11, 101, 102), skipped: [21, 21] },
    { ...emptyProgress(), seen: ['reward-2'] },
  ])('rejects malformed progress: %j', (value) => expect(() => parseProgress(value)).toThrow());
  test.each(['Rgarbage', 'I-1;', 'I99999;', 'R'.repeat(40001)])('rejects malformed or oversized action tapes', (moves) => {
    expect(() => parseSavedRoom({ id: 1, signature: 'map', moves })).toThrow();
  });
  test('requires a matching campaign version and strips untrusted account fields', () => {
    const request = { campaignVersion: CAMPAIGN_VERSION, epoch: null, roomRevision: 0, progress: emptyProgress() };
    expect(parseSyncRequest({ ...request, userId: 99 })).toEqual(request);
    for (const campaignVersion of [undefined, 1, 3]) {
      expect(() => parseSyncRequest({ ...request, campaignVersion })).toThrow();
      expect(() => parseCloudJourney({ ...emptyCloudJourney(), campaignVersion })).toThrow();
    }
    expect(() => parseSyncRequest({ ...request, epoch: -1 })).toThrow();
  });
});
