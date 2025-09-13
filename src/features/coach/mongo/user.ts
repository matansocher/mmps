import { Collection, Db } from 'mongodb';
import { getCollection, getMongoDb, User } from '@core/mongo/shared';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let userCollection: Collection<User>;

(async () => {
  db = await getMongoDb(DB_NAME);
  userCollection = getCollection<User>(db, COLLECTIONS.USER);
})();

export async function saveUserDetails(userDetails: Partial<User>): Promise<boolean> {
  try {
    const filter = { chatId: userDetails.chatId };
    const existingUserDetails = await userCollection.findOne(filter);

    if (existingUserDetails) {
      await userCollection.updateOne(filter, {
        $set: {
          ...userDetails,
          updatedAt: new Date(),
        },
      });
      return true;
    }

    const user = {
      ...userDetails,
      createdAt: new Date(),
    } as User;
    await userCollection.insertOne(user);
    return false;
  } catch (err) {
    console.error(`saveUserDetails - err: ${err}`);
    return false;
  }
}

export async function getUserDetails(chatId: number): Promise<User | null> {
  try {
    return userCollection.findOne({ chatId });
  } catch (err) {
    console.error(`getUserDetails - err: ${err}`);
    return null;
  }
}
