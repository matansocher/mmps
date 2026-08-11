import { getErrorMessage, Logger } from '@core/utils';
import { getMongoCollection } from './mongo-connection';
import type { SaveUserResult, User, UserDetails } from './types';

export function createUserRepository(dbName: string) {
  const logger = new Logger(`mongo:${dbName}:user-repo`);
  const getCollection = () => getMongoCollection<User>(dbName, 'User');

  async function saveUserDetails(userDetails: UserDetails): Promise<SaveUserResult> {
    try {
      const userCollection = getCollection();
      const filter = { chatId: userDetails.chatId };
      const existingUserDetails = await userCollection.findOne(filter);
      if (existingUserDetails) {
        await userCollection.updateOne(filter, { $set: { ...userDetails } });
        return 'updated';
      }

      const user = { ...userDetails, createdAt: new Date() };
      await userCollection.insertOne(user);
      return 'created';
    } catch (err) {
      logger.error(`saveUserDetails - err: ${getErrorMessage(err)}`);
      throw err;
    }
  }

  async function getUserDetails(chatId: number): Promise<User | null> {
    try {
      const userCollection = getCollection();
      return userCollection.findOne({ chatId });
    } catch (err) {
      logger.error(`getUserDetails - err: ${getErrorMessage(err)}`);
      throw err;
    }
  }

  return { saveUserDetails, getUserDetails };
}
