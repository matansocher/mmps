import { Logger } from '@core/utils';
import { getMongoCollection } from './mongo-connection';
import type { User } from './types';

export function createUserRepository(dbName: string) {
  const logger = new Logger(`${dbName}-UserRepository`);
  const getCollection = () => getMongoCollection<User>(dbName, 'User');

  async function saveUserDetails(userDetails: any): Promise<boolean> {
    try {
      const userCollection = getCollection();
      const filter = { chatId: userDetails.chatId };
      const existingUserDetails = await userCollection.findOne(filter);
      if (existingUserDetails) {
        await userCollection.updateOne(filter, { $set: { ...userDetails } });
        return true;
      }

      const user = { ...userDetails, createdAt: new Date() };
      await userCollection.insertOne(user);
      return false;
    } catch (err) {
      logger.error(`saveUserDetails - err: ${err}`);
      return false;
    }
  }

  async function getUserDetails(chatId: number): Promise<any> {
    try {
      const userCollection = getCollection();
      return userCollection.findOne({ chatId });
    } catch (err) {
      logger.error(`getUserDetails - err: ${err}`);
      return null;
    }
  }

  return { saveUserDetails, getUserDetails };
}
