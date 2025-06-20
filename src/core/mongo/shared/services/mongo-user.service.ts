import { Collection, Db } from 'mongodb';
import { Injectable, Logger } from '@nestjs/common';
import { UserDetails } from '@services/telegram';
import { User } from '../models';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoUserService {
  private readonly logger = new Logger(MongoUserService.name);
  private readonly userCollection: Collection<User>;

  constructor(private readonly database: Db) {
    this.userCollection = this.database.collection(COLLECTIONS.USER);
  }

  async saveUserDetails(userDetails: UserDetails): Promise<boolean> {
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

  async getUserDetails({ chatId }): Promise<User> {
    try {
      return this.userCollection.findOne({ chatId });
    } catch (err) {
      this.logger.error(`${this.getUserDetails.name} - err: ${err}`);
      return null;
    }
  }
}
