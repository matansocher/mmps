import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { savePreference, getPreference, getAllPreferences, deletePreference, searchPreferences } from '@shared/preferences/mongo/preferences.repository';

const DB_NAME = 'Preferences';
const COLLECTION_NAME = 'Preferences';

describe('preferences repository', () => {
  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('savePreference', () => {
    it('should insert a new preference', async () => {
      const result = await savePreference({ key: 'theme', value: 'dark' });

      expect(result.acknowledged).toBe(true);

      const pref = await getPreference('theme');
      expect(pref).not.toBeNull();
      expect(pref!.key).toBe('theme');
      expect(pref!.value).toBe('dark');
    });

    it('should update an existing preference (upsert)', async () => {
      await savePreference({ key: 'language', value: 'en' });
      await savePreference({ key: 'language', value: 'he' });

      const all = await getAllPreferences();
      expect(all).toHaveLength(1);
      expect(all[0].value).toBe('he');
    });
  });

  describe('getPreference', () => {
    it('should return null for non-existent key', async () => {
      const pref = await getPreference('nonexistent');
      expect(pref).toBeNull();
    });
  });

  describe('getAllPreferences', () => {
    it('should return all preferences sorted by updatedAt descending', async () => {
      await savePreference({ key: 'a', value: '1' });
      await savePreference({ key: 'b', value: '2' });
      await savePreference({ key: 'c', value: '3' });

      const all = await getAllPreferences();
      expect(all).toHaveLength(3);
      // Most recently updated first
      expect(all[0].key).toBe('c');
    });
  });

  describe('deletePreference', () => {
    it('should delete an existing preference', async () => {
      await savePreference({ key: 'toDelete', value: 'bye' });

      const result = await deletePreference('toDelete');
      expect(result.deletedCount).toBe(1);

      const pref = await getPreference('toDelete');
      expect(pref).toBeNull();
    });

    it('should return deletedCount 0 for non-existent key', async () => {
      const result = await deletePreference('ghost');
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('searchPreferences', () => {
    it('should find preferences matching key by regex', async () => {
      await savePreference({ key: 'user_name', value: 'John' });
      await savePreference({ key: 'user_email', value: 'john@example.com' });
      await savePreference({ key: 'theme', value: 'dark' });

      const results = await searchPreferences('user');
      expect(results).toHaveLength(2);
    });

    it('should find preferences matching value by regex', async () => {
      await savePreference({ key: 'greeting', value: 'Hello World' });
      await savePreference({ key: 'farewell', value: 'Goodbye' });

      const results = await searchPreferences('world');
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('greeting');
    });

    it('should be case insensitive', async () => {
      await savePreference({ key: 'City', value: 'Tel Aviv' });

      const results = await searchPreferences('tel aviv');
      expect(results).toHaveLength(1);
    });
  });
});
