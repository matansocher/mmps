import type { Collection } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMongoCollection } from '@core/mongo';
import { getUserLanguage, setUserLanguage } from './user';

vi.mock('@core/mongo', () => ({ getMongoCollection: vi.fn(), createUserRepository: vi.fn().mockReturnValue({}) }));

const findOne = vi.fn();
const updateOne = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMongoCollection).mockReturnValue({ findOne, updateOne } as unknown as Collection);
});

describe('Worldly language persistence', () => {
  it.each([null, {}, { language: 'fr' }, { language: 'en' }])('defaults users without a supported preference to English (%j)', async (user) => {
    findOne.mockResolvedValue(user);
    expect(await getUserLanguage(123)).toEqual('en');
  });

  it('reads a saved Hebrew preference', async () => {
    findOne.mockResolvedValue({ language: 'he' });
    expect(await getUserLanguage(123)).toEqual('he');
    expect(findOne).toHaveBeenCalledWith({ chatId: 123 });
  });

  it.each(['en', 'he'] as const)('persists %s without overwriting other preferences', async (language) => {
    await setUserLanguage(123, language);
    expect(getMongoCollection).toHaveBeenCalledWith('Worldly', 'User');
    expect(updateOne).toHaveBeenCalledWith({ chatId: 123 }, { $set: { language }, $setOnInsert: { chatId: 123, createdAt: expect.any(Date) } }, { upsert: true });
  });
});
