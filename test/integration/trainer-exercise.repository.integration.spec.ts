import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { addExercise, getTodayExercise, getExercises } from '@shared/trainer/mongo/exercise.repository';

const DB_NAME = 'Trainer';
const COLLECTION_NAME = 'Exercise';

describe('trainer exercise repository', () => {
  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('addExercise', () => {
    it('should insert an exercise with chatId and createdAt', async () => {
      const result = await addExercise(123);

      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();
    });
  });

  describe('getTodayExercise', () => {
    it('should return an exercise created today', async () => {
      await addExercise(123);

      const exercise = await getTodayExercise(123);

      expect(exercise).not.toBeNull();
      expect(exercise.chatId).toBe(123);
    });

    it('should return null if no exercise today', async () => {
      const exercise = await getTodayExercise(123);
      expect(exercise).toBeNull();
    });

    it('should not return exercises from other users', async () => {
      await addExercise(999);

      const exercise = await getTodayExercise(123);
      expect(exercise).toBeNull();
    });
  });

  describe('getExercises', () => {
    it('should return exercises sorted by createdAt descending', async () => {
      await addExercise(123);
      await addExercise(123);
      await addExercise(123);

      const exercises = await getExercises(123);

      expect(exercises).toHaveLength(3);
      // Verify descending order
      for (let i = 0; i < exercises.length - 1; i++) {
        expect(exercises[i].createdAt.getTime()).toBeGreaterThanOrEqual(exercises[i + 1].createdAt.getTime());
      }
    });

    it('should respect the limit parameter', async () => {
      await addExercise(123);
      await addExercise(123);
      await addExercise(123);

      const exercises = await getExercises(123, 2);

      expect(exercises).toHaveLength(2);
    });

    it('should only return exercises for the given chatId', async () => {
      await addExercise(100);
      await addExercise(100);
      await addExercise(200);

      const exercises = await getExercises(100);

      expect(exercises).toHaveLength(2);
      expect(exercises.every((e) => e.chatId === 100)).toBe(true);
    });
  });
});
