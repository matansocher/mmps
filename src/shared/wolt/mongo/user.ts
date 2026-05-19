import { createUserRepository, getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { DB_NAME } from './constants';

export const { saveUserDetails, getUserDetails } = createUserRepository(DB_NAME);

const logger = new Logger('wolt-user-preferences');

export async function getUserCity(chatId: number): Promise<string | null> {
  try {
    const user = await getMongoCollection<{ chatId: number; city?: string }>(DB_NAME, 'User').findOne({ chatId });
    return user?.city ?? null;
  } catch (err) {
    logger.error(`getUserCity - err: ${err}`);
    return null;
  }
}

export async function setUserCity(chatId: number, city: string | null): Promise<void> {
  try {
    const collection = getMongoCollection<{ chatId: number; city?: string | null }>(DB_NAME, 'User');
    if (city === null) {
      await collection.updateOne({ chatId }, { $unset: { city: '' } });
      return;
    }
    await collection.updateOne({ chatId }, { $set: { city } }, { upsert: true });
  } catch (err) {
    logger.error(`setUserCity - err: ${err}`);
    throw err;
  }
}
