import { Logger } from '@nestjs/common';
import { getMongoCollection } from '@core/mongo';
import { User } from '../types';
import { DB_NAME } from './index';

const logger = new Logger('StrikerUserRepository');
const getCollection = () => getMongoCollection<User>(DB_NAME, 'User');

export async function saveUserDetails(userDetails: any): Promise<boolean> {
  try {
    const userCollection = getCollection();
    const filter = { chatId: userDetails.chatId };
    const existingUserDetails = await userCollection.findOne(filter);

    if (existingUserDetails) {
      await userCollection.updateOne(filter, { $set: { ...userDetails } });
      return true;
    }

    const user: User = { ...userDetails, createdAt: new Date() };
    await userCollection.insertOne(user);
    return false;
  } catch (err) {
    logger.error(`saveUserDetails - err: ${err}`);
    return false;
  }
}

export async function getUserDetails(chatId: number): Promise<User | null> {
  try {
    const userCollection = getCollection();
    return userCollection.findOne({ chatId });
  } catch (err) {
    logger.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
