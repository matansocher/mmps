import { Db, Document, WithId } from 'mongodb';
import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { UserDetails } from '@services/telegram';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoUserService {
  private readonly logger = new Logger(MongoUserService.name);

  constructor(private readonly database: Db) {}

  async saveUserDetails(userDetails: UserDetails): Promise<void> {
    try {
      const userCollection = this.database.collection(COLLECTIONS.USER);
      const user = { ...userDetails, createdAt: new Date() };
      await userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(`${this.saveUserDetails.name} - err: ${getErrorMessage(err)}`);
    }
  }

  async getUserDetails({ chatId }): Promise<WithId<Document>> {
    try {
      const userCollection = this.database.collection(COLLECTIONS.USER);
      return userCollection.findOne({ chatId });
    } catch (err) {
      this.logger.error(`${this.getUserDetails.name} - err: ${getErrorMessage(err)}`);
      return null;
    }
  }
}
