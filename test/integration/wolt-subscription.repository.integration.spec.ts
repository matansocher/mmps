import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { addSubscription, getSubscription, getActiveSubscriptions, archiveSubscription, getExpiredSubscriptions, getTopBy } from '@shared/wolt/mongo/subscription';

const DB_NAME = 'Wolt';
const COLLECTION_NAME = 'Subscription';

describe('wolt subscription repository', () => {
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
    it('should create an active subscription', async () => {
      const result = await addSubscription(100, 'Pizza Place', 'https://photo.jpg');

      expect(result.acknowledged).toBe(true);

      const sub = await getSubscription(100, 'Pizza Place');
      expect(sub).not.toBeNull();
      expect(sub.isActive).toBe(true);
      expect(sub.restaurantPhoto).toBe('https://photo.jpg');
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return all active subscriptions when no chatId provided', async () => {
      await addSubscription(100, 'Restaurant A', 'a.jpg');
      await addSubscription(200, 'Restaurant B', 'b.jpg');

      const active = await getActiveSubscriptions();

      expect(active).toHaveLength(2);
    });

    it('should filter by chatId when provided', async () => {
      await addSubscription(100, 'Restaurant A', 'a.jpg');
      await addSubscription(200, 'Restaurant B', 'b.jpg');

      const active = await getActiveSubscriptions(100);

      expect(active).toHaveLength(1);
      expect(active[0].chatId).toBe(100);
    });

    it('should not return archived subscriptions', async () => {
      await addSubscription(100, 'Restaurant A', 'a.jpg');
      await archiveSubscription(100, 'Restaurant A', true);

      const active = await getActiveSubscriptions(100);

      expect(active).toHaveLength(0);
    });
  });

  describe('archiveSubscription', () => {
    it('should set isActive to false and record success status', async () => {
      await addSubscription(300, 'Sushi Bar', 'sushi.jpg');

      await archiveSubscription(300, 'Sushi Bar', true);

      const sub = await getSubscription(300, 'Sushi Bar');
      expect(sub).toBeNull(); // getSubscription filters by isActive: true
    });

    it('should only archive the active subscription for that restaurant', async () => {
      await addSubscription(300, 'Burger Joint', 'burger.jpg');
      await addSubscription(300, 'Taco Shop', 'taco.jpg');

      await archiveSubscription(300, 'Burger Joint', false);

      const active = await getActiveSubscriptions(300);
      expect(active).toHaveLength(1);
      expect(active[0].restaurant).toBe('Taco Shop');
    });
  });

  describe('getExpiredSubscriptions', () => {
    it('should return subscriptions older than the expiration hours', async () => {
      // Insert a subscription with createdAt in the past (25 hours ago)
      const { getMongoCollection } = await import('@core/mongo');
      const collection = getMongoCollection(DB_NAME, COLLECTION_NAME);
      await collection.insertOne({
        chatId: 400,
        restaurant: 'Old Place',
        restaurantPhoto: 'old.jpg',
        isActive: true,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });
      // Insert a fresh subscription
      await addSubscription(400, 'New Place', 'new.jpg');

      const expired = await getExpiredSubscriptions(24);

      expect(expired).toHaveLength(1);
      expect(expired[0].restaurant).toBe('Old Place');
    });

    it('should not return archived subscriptions even if old', async () => {
      const { getMongoCollection } = await import('@core/mongo');
      const collection = getMongoCollection(DB_NAME, COLLECTION_NAME);
      await collection.insertOne({
        chatId: 500,
        restaurant: 'Archived Old',
        restaurantPhoto: 'x.jpg',
        isActive: false,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      });

      const expired = await getExpiredSubscriptions(24);

      expect(expired).toHaveLength(0);
    });
  });

  describe('getTopBy', () => {
    it('should return top restaurants by count', async () => {
      await addSubscription(1, 'Pizza', 'p.jpg');
      await addSubscription(2, 'Pizza', 'p.jpg');
      await addSubscription(3, 'Pizza', 'p.jpg');
      await addSubscription(1, 'Burger', 'b.jpg');
      await addSubscription(2, 'Burger', 'b.jpg');
      await addSubscription(1, 'Sushi', 's.jpg');

      const top = await getTopBy('restaurant');

      expect(top[0]._id).toBe('Pizza');
      expect(top[0].count).toBe(3);
      expect(top[1]._id).toBe('Burger');
      expect(top[1].count).toBe(2);
    });

    it('should return top users by subscription count', async () => {
      await addSubscription(10, 'A', 'a.jpg');
      await addSubscription(10, 'B', 'b.jpg');
      await addSubscription(10, 'C', 'c.jpg');
      await addSubscription(20, 'D', 'd.jpg');

      const top = await getTopBy('chatId');

      expect(top[0]._id).toBe(10);
      expect(top[0].count).toBe(3);
    });
  });
});
