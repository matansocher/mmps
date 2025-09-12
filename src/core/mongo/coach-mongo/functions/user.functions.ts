import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { COLLECTIONS, DB_NAME } from '../coach-mongo.config';

export async function saveUserDetails(userDetails: any): Promise<boolean> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection(db, COLLECTIONS.USER);

  try {
    const filter = { chatId: userDetails.chatId };
    const existingUserDetails = await collection.findOne(filter);
    if (existingUserDetails) {
      await collection.updateOne(filter, { $set: { ...userDetails } });
      return true;
    }

    const user = { ...userDetails, createdAt: new Date() };
    await collection.insertOne(user);
    return false;
  } catch (err) {
    console.error(`saveUserDetails - err: ${err}`);
    return false;
  }
}

export async function getUserDetails(chatId: number): Promise<any> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection(db, COLLECTIONS.USER);

  try {
    return collection.findOne({ chatId });
  } catch (err) {
    console.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
