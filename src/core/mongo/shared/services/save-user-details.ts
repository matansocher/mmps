import { Db } from 'mongodb';
import { UserDetails } from '@services/telegram';
import { User } from '../models';

export async function saveUserDetails(db: Db, userDetails: UserDetails): Promise<boolean> {
  try {
    const filter = { chatId: userDetails.chatId };
    const existingUserDetails = await this.userCollection.findOne(filter);
    if (existingUserDetails) {
      await this.userCollection.updateOne(filter, { $set: { ...userDetails } });
      return true;
    }

    const user = { ...userDetails, createdAt: new Date() } as unknown as User;
    await this.userCollection.insertOne(user);
    return false;
  } catch (err) {
    this.logger.error(`${this.saveUserDetails.name} - err: ${err}`);
    return false;
  }
}
