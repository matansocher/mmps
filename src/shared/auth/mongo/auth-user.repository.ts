import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { DB_NAME, COLLECTIONS } from './constants';
import type { AuthUser } from '../types';

const logger = new Logger('AuthUserRepository');
const getCollection = () => getMongoCollection<AuthUser>(DB_NAME, COLLECTIONS.USERS);

export async function upsertAuthUser(userData: {
  telegramUserId: number;
  username: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  phoneNumber?: string;
}): Promise<AuthUser> {
  try {
    const collection = getCollection();
    const now = new Date();

    const result = await collection.findOneAndUpdate(
      { telegramUserId: userData.telegramUserId },
      {
        $set: { ...userData, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return result;
  } catch (err) {
    logger.error(`upsertAuthUser - err: ${err}`);
    throw err;
  }
}

export async function getAuthUserByTelegramId(telegramUserId: number): Promise<AuthUser | null> {
  try {
    const collection = getCollection();
    return collection.findOne({ telegramUserId });
  } catch (err) {
    logger.error(`getAuthUserByTelegramId - err: ${err}`);
    return null;
  }
}
