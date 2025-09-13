import { User } from '@core/mongo/shared';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

export async function saveUserDetails(userDetails: any): Promise<boolean> {
  try {
    const userCollection = await getCollection<User>(COLLECTIONS.USER);
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
    const userCollection = await getCollection<User>(COLLECTIONS.USER);
    return userCollection.findOne({ chatId });
  } catch (err) {
    console.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
