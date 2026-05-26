import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { addSubscription, getSubscription, getActiveSubscriptions, updateSubscription } from '@shared/coach/mongo/subscription.repository';

const DB_NAME = 'Coach';
const COLLECTION_NAME = 'Subscription';

describe('coach subscription repository', () => {
  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('addSubscription', () => {
    it('should create a new active subscription', async () => {
      const result = await addSubscription(111);

      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();

      const sub = await getSubscription(111);
      expect(sub).not.toBeNull();
      expect(sub.chatId).toBe(111);
      expect(sub.isActive).toBe(true);
    });
  });

  describe('getSubscription', () => {
    it('should return null for non-existent chatId', async () => {
      const sub = await getSubscription(99999);
      expect(sub).toBeNull();
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions', async () => {
      await addSubscription(100);
      await addSubscription(200);
      await addSubscription(300);
      await updateSubscription(200, { isActive: false });

      const active = await getActiveSubscriptions();

      expect(active).toHaveLength(2);
      expect(active.map((s) => s.chatId).sort()).toEqual([100, 300]);
    });
  });

  describe('updateSubscription', () => {
    it('should deactivate a subscription', async () => {
      await addSubscription(555);

      await updateSubscription(555, { isActive: false });

      const sub = await getSubscription(555);
      expect(sub.isActive).toBe(false);
    });

    it('should update custom leagues', async () => {
      await addSubscription(777);

      await updateSubscription(777, { customLeagues: [1, 2, 3] });

      const sub = await getSubscription(777);
      expect(sub.customLeagues).toEqual([1, 2, 3]);
    });
  });
});
