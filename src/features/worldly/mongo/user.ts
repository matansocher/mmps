import { Collection, Db } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let userCollection: Collection;

(async () => {
  db = await getMongoDb(DB_NAME);
  userCollection = getMongoCollection(db, COLLECTIONS.USER);
})();

export async function saveUserDetails(userDetails: any): Promise<boolean> {
  try {
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
    return userCollection.findOne({ chatId });
  } catch (err) {
    console.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
