import { Db } from 'mongodb';
import { User } from '@core/mongo';

export async function getUserDetails(db: Db, chatId: number): Promise<User> {
  try {
    return this.userCollection.findOne({ chatId });
  } catch (err) {
    this.logger.error(`${this.getUserDetails.name} - err: ${err}`);
    return null;
  }
}
