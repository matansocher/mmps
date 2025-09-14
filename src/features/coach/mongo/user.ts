import { getCollection } from '@core/mongo';
import { User } from '@core/mongo/shared';
import { dbName } from './index';

function getUserCollection<T>() {
  return getCollection<T>(dbName, 'User');
}

export async function saveUserDetails(userDetails: any): Promise<boolean> {
  try {
    const userCollection = getUserCollection<User>();
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
    console.error(`saveUserDetails - err: ${err}`);
    return false;
  }
}

export async function getUserDetails(chatId: number): Promise<any> {
  try {
    const userCollection = getUserCollection<User>();
    return userCollection.findOne({ chatId });
  } catch (err) {
    console.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
