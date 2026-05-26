import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { createUserRepository } from '@core/mongo/user.repository';

const DB_NAME = 'TestBot';
const COLLECTION_NAME = 'User';

describe('core user repository', () => {
  let userRepo: ReturnType<typeof createUserRepository>;

  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
    userRepo = createUserRepository(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('saveUserDetails', () => {
    it('should insert a new user and return false (not existing)', async () => {
      const wasExisting = await userRepo.saveUserDetails({
        chatId: 1001,
        telegramUserId: 5001,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      expect(wasExisting).toBe(false);

      const user = await userRepo.getUserDetails(1001);
      expect(user).not.toBeNull();
      expect(user.firstName).toBe('John');
      expect(user.username).toBe('johndoe');
    });

    it('should update an existing user and return true', async () => {
      await userRepo.saveUserDetails({
        chatId: 2002,
        telegramUserId: 6002,
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
      });

      const wasExisting = await userRepo.saveUserDetails({
        chatId: 2002,
        telegramUserId: 6002,
        firstName: 'Janet',
        lastName: 'Smith',
        username: 'janetsmith',
      });

      expect(wasExisting).toBe(true);

      const user = await userRepo.getUserDetails(2002);
      expect(user.firstName).toBe('Janet');
      expect(user.username).toBe('janetsmith');
    });

    it('should not create duplicate users for the same chatId', async () => {
      await userRepo.saveUserDetails({ chatId: 3003, telegramUserId: 7003, firstName: 'A', lastName: 'B', username: 'ab' });
      await userRepo.saveUserDetails({ chatId: 3003, telegramUserId: 7003, firstName: 'C', lastName: 'D', username: 'cd' });

      const { getMongoCollection } = await import('@core/mongo');
      const collection = getMongoCollection(DB_NAME, COLLECTION_NAME);
      const count = await collection.countDocuments({ chatId: 3003 });

      expect(count).toBe(1);
    });
  });

  describe('getUserDetails', () => {
    it('should return null for non-existent chatId', async () => {
      const user = await userRepo.getUserDetails(99999);
      expect(user).toBeNull();
    });

    it('should return the user with all fields', async () => {
      await userRepo.saveUserDetails({
        chatId: 4004,
        telegramUserId: 8004,
        firstName: 'Bob',
        lastName: 'Builder',
        username: 'bobbuilder',
      });

      const user = await userRepo.getUserDetails(4004);

      expect(user.chatId).toBe(4004);
      expect(user.telegramUserId).toBe(8004);
      expect(user.firstName).toBe('Bob');
      expect(user.lastName).toBe('Builder');
      expect(user.createdAt).toBeDefined();
    });
  });
});
