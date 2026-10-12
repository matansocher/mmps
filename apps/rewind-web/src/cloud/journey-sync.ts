import { CAMPAIGN_VERSION, emptyCloudJourney, isRoomId, mergeProgress, migrateLegacyProgress, parseCloudJourney, parseSavedRoom, roomNumber } from '../../../../src/shared/rewind';
import type { CloudJourney, Progress, SavedRoom, SyncRequest, SyncResult } from '../../../../src/shared/rewind';
import type { Identity } from './identity';

type LocalJourney = CloudJourney & { readonly dirty: boolean; readonly roomDirty: boolean };
export type SyncStatus = {
  readonly state: 'local' | 'pending' | 'syncing' | 'saved' | 'offline' | 'error';
  readonly notice: string;
};
export type RemoteChange = { readonly progress: Progress; readonly room: SavedRoom | null; readonly replaceRoom: boolean; readonly reset: boolean };
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type FetchPort = (input: string, init?: RequestInit) => Promise<Response>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const journeyStorageKey = (userId: number): string => `rewind.telegram.${userId}.v${CAMPAIGN_VERSION}`;
function readLocal(storage: StoragePort, key: string): LocalJourney | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('room' in data) || !('dirty' in data) || typeof data.dirty !== 'boolean' || !('roomDirty' in data) || typeof data.roomDirty !== 'boolean')
    throw new Error('Invalid local Telegram journey');
  return { ...parseCloudJourney({ ...data, room: null }), room: parseSavedRoom(data.room, Infinity), dirty: data.dirty, roomDirty: data.roomDirty };
}

export class JourneySync {
  readonly identity: Identity;
  readonly storageKey: string;
  readonly migrated: boolean;
  private readonly storage: StoragePort;
  private readonly fetcher: FetchPort;
  private value: LocalJourney;
  private status: SyncStatus = { state: 'pending', notice: '' };
  private listeners = new Set<() => void>();
  private onRemote?: (change: RemoteChange) => void;
  private timer?: ReturnType<typeof setTimeout>;
  private flight: Promise<void> | null = null;
  private resetting = false;
  private active = false;
  private holdRoom = false;
  private localVersion = 0;
  private roomVersion = 0;
  private controller?: AbortController;

  constructor(identity: Identity, storage: StoragePort, fetcher: FetchPort = (input, init) => fetch(input, init)) {
    this.identity = identity;
    this.storage = storage;
    this.fetcher = fetcher;
    this.storageKey = journeyStorageKey(identity.userId);
    const current = readLocal(storage, this.storageKey);
    const legacy = current ? null : storage.getItem(`rewind.telegram.${identity.userId}.v1`);
    this.migrated = !!legacy;
    let progress = emptyCloudJourney().progress;
    if (legacy) {
      const data: unknown = JSON.parse(legacy);
      if (!data || typeof data !== 'object' || !('progress' in data)) throw new Error('Invalid previous Telegram journey');
      progress = migrateLegacyProgress(data.progress);
    }
    this.value = current ?? { ...emptyCloudJourney(), progress, dirty: this.migrated, roomDirty: false };
  }

  get journey(): CloudJourney {
    return this.value;
  }
  getSnapshot = (): SyncStatus => this.status;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(state: SyncStatus['state'], notice = this.status.notice): void {
    this.status = { state, notice };
    for (const listener of this.listeners) listener();
  }
  private persist(fromResponse = false): void {
    const stored = readLocal(this.storage, this.storageKey);
    if (stored && stored.epoch > this.value.epoch) {
      this.value = stored;
      this.onRemote?.({ progress: stored.progress, room: stored.room, replaceRoom: true, reset: true });
      return;
    }
    if (stored?.epoch === this.value.epoch) {
      const progress = mergeProgress(this.value.progress, stored.progress).progress;
      const preserveRoom = fromResponse && (stored.roomDirty || stored.roomRevision > this.value.roomRevision) && !same(stored.room, this.value.room);
      const changed = !same(progress, this.value.progress) || preserveRoom;
      this.value = {
        ...this.value,
        progress,
        revision: Math.max(this.value.revision, stored.revision),
        roomRevision: Math.max(this.value.roomRevision, stored.roomRevision),
        ...(preserveRoom ? { room: stored.room, roomDirty: stored.roomDirty } : {}),
        dirty: this.value.dirty || changed,
      };
    }
    this.storage.setItem(this.storageKey, JSON.stringify(this.value));
  }
  start(onRemote: (change: RemoteChange) => void): () => void {
    this.active = true;
    this.onRemote = onRemote;
    this.schedule(0);
    return () => {
      this.active = false;
      this.onRemote = undefined;
      clearTimeout(this.timer);
      this.controller?.abort();
    };
  }
  private schedule(delay = 500): void {
    clearTimeout(this.timer);
    if (this.active && !this.resetting)
      this.timer = setTimeout(() => {
        void this.sync();
      }, delay);
  }
  update(progress: Progress, room: SavedRoom): void {
    const roomChanged = !same(room, this.value.room);
    if (!roomChanged && same(progress, this.value.progress)) return;
    this.localVersion++;
    if (roomChanged) {
      this.roomVersion++;
      this.holdRoom = false;
    }
    this.value = { ...this.value, progress, room, dirty: true, roomDirty: this.value.roomDirty || roomChanged };
    this.persist();
    this.publish('pending');
    this.schedule();
  }
  async sync(): Promise<void> {
    if (this.flight) return this.flight;
    if (this.resetting || !this.active) return;
    this.flight = this.performSync();
    try {
      await this.flight;
    } finally {
      this.flight = null;
    }
  }
  private async request(path: string, body: unknown): Promise<unknown> {
    this.controller = new AbortController();
    const timeout = setTimeout(() => this.controller?.abort(), 10000);
    try {
      const response = await this.fetcher(`/api/rewind/progress/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.identity.headers },
        body: JSON.stringify(body),
        signal: this.controller.signal,
        cache: 'no-store',
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'Reopen Rewind from Telegram to reconnect your account.'
            : response.status === 409
              ? 'Your journey changed on another device. Sync, then try again.'
              : 'The cloud save is unavailable. Your journey is kept on this device.',
        );
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  private async performSync(): Promise<void> {
    const sent = this.value;
    const version = this.localVersion;
    const roomVersion = this.roomVersion;
    const longRoom = (sent.room?.moves.length ?? 0) > 40000;
    const request: SyncRequest = {
      campaignVersion: CAMPAIGN_VERSION,
      epoch: sent.epoch,
      progress: sent.progress,
      roomRevision: sent.roomRevision,
      ...(sent.roomDirty && !longRoom ? { room: sent.room } : {}),
    };
    this.publish('syncing');
    try {
      const raw = await this.request('sync', request);
      if (
        !raw ||
        typeof raw !== 'object' ||
        !('journey' in raw) ||
        !('reset' in raw) ||
        typeof raw.reset !== 'boolean' ||
        !('roomConflict' in raw) ||
        typeof raw.roomConflict !== 'boolean' ||
        !('rejectedSkips' in raw) ||
        !Array.isArray(raw.rejectedSkips) ||
        !raw.rejectedSkips.every((id) => typeof id === 'number' && isRoomId(id))
      )
        throw new Error('The cloud returned an unreadable save.');
      const result: SyncResult = { journey: parseCloudJourney(raw.journey), reset: raw.reset, roomConflict: raw.roomConflict, rejectedSkips: raw.rejectedSkips };
      if (!this.active) return;
      const newer = this.localVersion !== version;
      const newerRoom = this.roomVersion !== roomVersion;
      const reconciliation = mergeProgress(result.journey.progress, {
        ...this.value.progress,
        skipped: this.value.progress.skipped.filter((id) => !result.rejectedSkips.includes(id)),
      });
      const progress = result.reset ? result.journey.progress : reconciliation.progress;
      const rejectedSkips = [...new Set([...result.rejectedSkips, ...reconciliation.rejectedSkips])];
      if (result.roomConflict) this.holdRoom = true;
      const replaceRoom = result.reset || (!newerRoom && !this.holdRoom && !longRoom);
      this.value = {
        ...result.journey,
        progress,
        room: replaceRoom ? result.journey.room : this.value.room,
        dirty: !result.reset && newer,
        roomDirty: !result.reset && (newerRoom || longRoom),
      };
      try {
        this.persist(!newerRoom);
      } finally {
        this.onRemote?.({ progress: this.value.progress, room: this.value.room, replaceRoom, reset: result.reset });
      }
      const notice = result.reset
        ? 'The journey was reset on another device. This device now uses that fresh save.'
        : rejectedSkips.length
          ? `Some skips were already spent on another device. Rooms ${rejectedSkips.map(roomNumber).join(', ')} remain open to solve; all earned stars are kept.`
          : result.roomConflict
            ? 'Another device saved a different room. Your current room is kept here; your next move will make it the shared saved room.'
            : longRoom
              ? 'This unusually long attempt is saved only on this device. Stars and chapter progress still sync.'
              : '';
      this.publish(this.value.dirty ? 'pending' : 'saved', notice);
      if (this.value.dirty) this.schedule(0);
    } catch (error) {
      if (!this.active) return;
      console.warn('Rewind cloud synchronization failed.', error);
      this.publish(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error', error instanceof Error ? error.message : 'Cloud saving failed. Retry when connected.');
    }
  }
  async reset(): Promise<void> {
    this.resetting = true;
    clearTimeout(this.timer);
    try {
      if (this.flight) await this.flight;
      const raw = await this.request('reset', { campaignVersion: CAMPAIGN_VERSION, epoch: this.value.epoch });
      if (!raw || typeof raw !== 'object' || !('journey' in raw)) throw new Error('The reset could not be confirmed.');
      const journey = parseCloudJourney(raw.journey);
      this.value = { ...journey, dirty: false, roomDirty: false };
      this.holdRoom = false;
      this.localVersion++;
      this.roomVersion++;
      this.onRemote?.({ progress: journey.progress, room: null, replaceRoom: true, reset: true });
      this.persist();
      this.publish('saved', '');
    } finally {
      this.resetting = false;
    }
  }
}
