import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { createSubscription, getSubscription, getActiveSubscriptions, updateSubscription, removeSubscription } from '@shared/youtube-follower/mongo/subscription.repository';

const DB_NAME = 'YoutubeFollower';
const COLLECTION_NAME = 'Subscription';

describe('youtube-follower subscription repository', () => {
  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('createSubscription', () => {
    it('should create an active subscription with all fields', async () => {
      const result = await createSubscription({
        channelId: 'UC123',
        channelName: 'Cool Channel',
        channelHandle: '@coolchannel',
        channelUrl: 'https://youtube.com/@coolchannel',
      });

      expect(result.acknowledged).toBe(true);

      const sub = await getSubscription('UC123');
      expect(sub).not.toBeNull();
      expect(sub!.channelName).toBe('Cool Channel');
      expect(sub!.isActive).toBe(true);
      expect(sub!.lastNotifiedVideoId).toBeNull();
    });
  });

  describe('getSubscription', () => {
    it('should return null for non-existent channel', async () => {
      const sub = await getSubscription('nonexistent');
      expect(sub).toBeNull();
    });

    it('should not return inactive subscriptions', async () => {
      await createSubscription({
        channelId: 'UC456',
        channelName: 'Removed Channel',
        channelHandle: '@removed',
        channelUrl: 'https://youtube.com/@removed',
      });
      await removeSubscription('UC456');

      const sub = await getSubscription('UC456');
      expect(sub).toBeNull();
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions', async () => {
      await createSubscription({ channelId: 'UC1', channelName: 'A', channelHandle: '@a', channelUrl: 'url1' });
      await createSubscription({ channelId: 'UC2', channelName: 'B', channelHandle: '@b', channelUrl: 'url2' });
      await createSubscription({ channelId: 'UC3', channelName: 'C', channelHandle: '@c', channelUrl: 'url3' });
      await removeSubscription('UC2');

      const active = await getActiveSubscriptions();

      expect(active).toHaveLength(2);
      expect(active.map((s) => s.channelId).sort()).toEqual(['UC1', 'UC3']);
    });
  });

  describe('updateSubscription', () => {
    it('should update lastNotifiedVideoId', async () => {
      await createSubscription({ channelId: 'UC789', channelName: 'Test', channelHandle: '@test', channelUrl: 'url' });

      await updateSubscription('UC789', { lastNotifiedVideoId: 'video-abc' });

      const sub = await getSubscription('UC789');
      expect(sub!.lastNotifiedVideoId).toBe('video-abc');
    });

    it('should update channelName', async () => {
      await createSubscription({ channelId: 'UC000', channelName: 'Old Name', channelHandle: '@old', channelUrl: 'url' });

      await updateSubscription('UC000', { channelName: 'New Name' });

      const sub = await getSubscription('UC000');
      expect(sub!.channelName).toBe('New Name');
    });

    it('should set updatedAt on update', async () => {
      await createSubscription({ channelId: 'UC111', channelName: 'X', channelHandle: '@x', channelUrl: 'url' });
      const before = await getSubscription('UC111');

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));
      await updateSubscription('UC111', { channelName: 'Y' });

      const after = await getSubscription('UC111');
      expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
    });
  });

  describe('removeSubscription', () => {
    it('should soft-delete by setting isActive to false', async () => {
      await createSubscription({ channelId: 'UC_DEL', channelName: 'Delete Me', channelHandle: '@del', channelUrl: 'url' });

      const result = await removeSubscription('UC_DEL');

      expect(result.modifiedCount).toBe(1);

      // Verify it's gone from active queries
      const sub = await getSubscription('UC_DEL');
      expect(sub).toBeNull();
    });

    it('should return modifiedCount 0 for non-existent channel', async () => {
      const result = await removeSubscription('nonexistent');
      expect(result.modifiedCount).toBe(0);
    });
  });
});
