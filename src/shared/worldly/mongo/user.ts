import { getMongoCollection, User } from '@core/mongo';
import { Logger } from '@core/utils';
import { DB_NAME } from './index';

const logger = new Logger('WorldlyUserRepository');
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

    const user = { ...userDetails, createdAt: new Date() };
    await userCollection.insertOne(user);
    return false;
  } catch (err) {
    logger.error(`saveUserDetails - err: ${err}`);
    return false;
  }
}

export async function getUserDetails(chatId: number): Promise<any> {
  try {
    const userCollection = getCollection();
    return userCollection.findOne({ chatId });
  } catch (err) {
    logger.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
