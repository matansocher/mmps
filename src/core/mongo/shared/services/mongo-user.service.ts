import { Collection, Db } from 'mongodb';
import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { UserDetails } from '@services/telegram';
import { UserModel } from '../models';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoUserService {
  private readonly logger = new Logger(MongoUserService.name);
  private readonly userCollection: Collection<UserModel>;

  constructor(private readonly database: Db) {
    this.userCollection = this.database.collection(COLLECTIONS.USER);
  }

  async saveUserDetails(userDetails: UserDetails): Promise<void> {
    try {
      const filter = { chatId: userDetails.chatId };
      const existingUserDetails = await this.userCollection.findOne(filter);
      if (existingUserDetails) {
        await this.userCollection.updateOne(filter, { $set: { ...userDetails } });
        return;
      }

      const user = { ...userDetails, createdAt: new Date() } as unknown as UserModel;
      await this.userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(`${this.saveUserDetails.name} - err: ${getErrorMessage(err)}`);
    }
  }

  async getUserDetails({ chatId }): Promise<UserModel> {
    try {
      return this.userCollection.findOne({ chatId });
    } catch (err) {
      this.logger.error(`${this.getUserDetails.name} - err: ${getErrorMessage(err)}`);
      return null;
    }
  }
}
