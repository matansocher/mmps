import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { emptyCloudJourney, emptyProgress, mergeJourney, parseSyncRequest } from '../../../../src/shared/rewind';
import type { CloudJourney, Progress } from '../../../../src/shared/rewind';
import { telegramIdentity } from './identity';
import { journeyStorageKey, JourneySync } from './journey-sync';

const room = (moves = '') => ({ id: 1, signature: 'test-map', moves });
const solved = (id: number): Progress => ({ ...emptyProgress(), completed: { [id]: { stars: 3, bestMoves: 5 } } });
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function server() {
  const journeys = new Map<string, CloudJourney>();
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    const key = new Headers(init?.headers).get('X-Rewind-Dev-User')!;
    const saved = journeys.get(key) ?? emptyCloudJourney();
    if (_url.endsWith('/reset')) {
      const { epoch } = JSON.parse(String(init?.body));
      if (epoch !== saved.epoch) return new Response('', { status: 409 });
      const journey = { ...emptyCloudJourney(), epoch: saved.epoch + 1 };
      journeys.set(key, journey);
      return Response.json({ journey });
    }
    const result = mergeJourney(saved, parseSyncRequest(JSON.parse(String(init?.body))));
    journeys.set(key, result.journey);
    return Response.json(result);
  });
  return { journeys, fetcher };
}
function identity(id = 123) {
  return { userId: id, headers: { 'X-Rewind-Dev-User': String(id) } };
}

describe('JourneySync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('calls the browser fetch function without a JourneySync receiver', async () => {
    const backend = server();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async function (this: unknown, input, init) {
      if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
      return await backend.fetcher(String(input), init);
    });
    const sync = new JourneySync(identity(), storage());
    const stop = sync.start(vi.fn());
    sync.update(solved(1), room('R'));
    await sync.sync();
    expect(sync.getSnapshot().state).toEqual('saved');
    expect(backend.journeys.get('123')?.room).toEqual(room('R'));
    stop();
  });
  test('fresh phone and computer converge, including the saved room', async () => {
    const backend = server();
    const phone = new JourneySync(identity(), storage(), backend.fetcher);
    const stop = phone.start(vi.fn());
    phone.update(solved(1), room('RR'));
    await phone.sync();
    const computer = new JourneySync(identity(), storage(), backend.fetcher);
    const receive = vi.fn();
    const stopComputer = computer.start(receive);
    await computer.sync();
    expect(computer.journey.progress).toEqual(phone.journey.progress);
    expect(computer.journey.room).toEqual(room('RR'));
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ replaceRoom: true, room: room('RR') }));
    stop();
    stopComputer();
  });
  test('isolates Telegram accounts and never automatically claims guest saves', async () => {
    const disk = storage();
    disk.setItem('rewind.solo.progress.v1', JSON.stringify(solved(5)));
    const backend = server();
    const first = new JourneySync(identity(1), disk, backend.fetcher);
    const second = new JourneySync(identity(2), disk, backend.fetcher);
    const stop = first.start(vi.fn());
    first.update(solved(1), room());
    await first.sync();
    expect(second.journey.progress).toEqual(emptyProgress());
    expect(disk.data.has(journeyStorageKey(2))).toEqual(false);
    expect(JSON.stringify([...disk.data.values()])).not.toContain('X-Rewind-Dev-User');
    stop();
  });
  test('two tabs cannot overwrite each other’s unsynced stars on the same browser', () => {
    const disk = storage();
    const first = new JourneySync(identity(), disk);
    const second = new JourneySync(identity(), disk);
    first.update(solved(1), room('R'));
    second.update(solved(11), room('RR'));
    const restored = new JourneySync(identity(), disk);
    expect(Object.keys(restored.journey.progress.completed)).toEqual(['1', '11']);
    expect(restored.journey.room).toEqual(room('RR'));
  });
  test('persists offline changes and merges them on the next visit', async () => {
    const backend = server();
    const disk = storage();
    const failed = new JourneySync(identity(), disk, async () => {
      throw new Error('offline');
    });
    const stop = failed.start(vi.fn());
    failed.update(solved(1), room('R'));
    await failed.sync();
    expect(failed.getSnapshot().state).toEqual('error');
    stop();
    const retry = new JourneySync(identity(), disk, backend.fetcher);
    const stopRetry = retry.start(vi.fn());
    await retry.sync();
    expect(backend.journeys.get('123')?.progress).toEqual(solved(1));
    expect(retry.getSnapshot().state).toEqual('saved');
    stopRetry();
  });
  test('keeps actions and stars earned while a response was in flight', async () => {
    const backend = server();
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sync = new JourneySync(identity(), storage(), async (url, init) => {
      await held;
      return backend.fetcher(url, init);
    });
    const stop = sync.start(vi.fn());
    sync.update(solved(1), room('R'));
    const flight = sync.sync();
    sync.update({ ...solved(11), completed: { ...solved(1).completed, ...solved(11).completed } }, room('RR'));
    release!();
    await flight;
    expect(sync.journey.room?.moves).toEqual('RR');
    expect(sync.journey.progress.completed[11].stars).toEqual(3);
    await sync.sync();
    expect(backend.journeys.get('123')?.room?.moves).toEqual('RR');
    stop();
  });
  test('a reset invalidates stale offline devices and resets the room', async () => {
    const backend = server();
    const first = new JourneySync(identity(), storage(), backend.fetcher);
    const second = new JourneySync(identity(), storage(), backend.fetcher);
    const stopA = first.start(vi.fn());
    const receive = vi.fn();
    const stopB = second.start(receive);
    first.update(solved(1), room('R'));
    await first.sync();
    await second.sync();
    await first.reset();
    second.update(solved(101), room('RR'));
    await second.sync();
    expect(second.journey.progress).toEqual(emptyProgress());
    expect(second.journey.epoch).toEqual(1);
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ reset: true }));
    expect(backend.journeys.get('123')?.progress).toEqual(emptyProgress());
    stopA();
    stopB();
  });
  test('keeps a conflicting local room until the player makes a new move', async () => {
    const backend = server();
    backend.journeys.set('123', { ...emptyCloudJourney(), room: room('RR'), roomRevision: 2 });
    const sync = new JourneySync(identity(), storage(), backend.fetcher);
    const stop = sync.start(vi.fn());
    sync.update(emptyProgress(), room('L'));
    await sync.sync();
    expect(sync.journey.room).toEqual(room('L'));
    expect(backend.journeys.get('123')?.room).toEqual(room('RR'));
    await sync.sync();
    expect(sync.journey.room).toEqual(room('L'));
    sync.update(emptyProgress(), room('LL'));
    await sync.sync();
    expect(backend.journeys.get('123')?.room).toEqual(room('LL'));
    stop();
  });
  test('very long attempts stay local without blocking cloud stars', async () => {
    const backend = server();
    const disk = storage();
    const sync = new JourneySync(identity(), disk, backend.fetcher);
    const stop = sync.start(vi.fn());
    sync.update(solved(1), room('R'.repeat(40001)));
    await sync.sync();
    expect(backend.journeys.get('123')?.progress).toEqual(solved(1));
    expect(sync.getSnapshot().notice).toContain('only on this device');
    expect(new JourneySync(identity(), disk, backend.fetcher).journey.room?.moves.length).toEqual(40001);
    stop();
  });
  test.each([1, 2])('does not overwrite a corrupt v%s account cache', (version) => {
    const disk = storage();
    const key = `rewind.telegram.123.v${version}`;
    disk.setItem(key, '{broken');
    expect(() => new JourneySync(identity(), disk)).toThrow();
    expect(disk.getItem(key)).toEqual('{broken');
  });
  test('migrates only the same account’s unchanged puzzles and leaves its old journey intact', async () => {
    const disk = storage();
    const backend = server();
    const legacy = JSON.stringify({
      epoch: 4,
      revision: 9,
      roomRevision: 2,
      dirty: true,
      roomDirty: true,
      progress: { ...emptyProgress(), completed: { ...solved(1).completed, ...solved(2).completed, ...solved(11).completed, ...solved(21).completed } },
      room: { id: 27, signature: 'retired-map', moves: 'R' },
    });
    disk.setItem('rewind.telegram.123.v1', legacy);
    const sync = new JourneySync(identity(), disk, backend.fetcher);
    expect(sync.migrated).toEqual(true);
    expect(sync.journey.campaignVersion).toEqual(2);
    expect(sync.journey.epoch).toEqual(0);
    expect(sync.journey.room).toEqual(null);
    expect(Object.keys(sync.journey.progress.completed)).toEqual(['1', '11', '21']);
    const stop = sync.start(vi.fn());
    await sync.sync();
    expect(backend.journeys.get('123')?.progress).toEqual(sync.journey.progress);
    expect(disk.getItem('rewind.telegram.123.v1')).toEqual(legacy);
    expect(new JourneySync(identity(456), disk).journey.progress).toEqual(emptyProgress());
    stop();
  });
  test('server failures and unreadable responses remain visibly unsynced', async () => {
    for (const response of [new Response('', { status: 401 }), Response.json({ journey: { progress: 'broken' } })]) {
      const disk = storage();
      const sync = new JourneySync(identity(), disk, async () => response);
      const stop = sync.start(vi.fn());
      sync.update(solved(1), room());
      await sync.sync();
      expect(sync.journey.progress).toEqual(solved(1));
      expect(sync.getSnapshot().state).toEqual('error');
      expect(JSON.parse(disk.getItem(sync.storageKey)!).dirty).toEqual(true);
      stop();
    }
  });
  test('Telegram identity is scoped by ID, not username', () => {
    expect(telegramIdentity('user=%7B%22id%22%3A123%7D&hash=signed')?.userId).toEqual(123);
    expect(telegramIdentity('')).toEqual(null);
    expect(() => telegramIdentity('user=%7B%22username%22%3A%22someone%22%7D')).toThrow();
  });
});
