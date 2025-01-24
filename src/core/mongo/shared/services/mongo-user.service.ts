import { Db } from 'mongodb';
import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { TelegramMessageData } from '@services/telegram';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoUserService {
  private readonly logger = new Logger(MongoUserService.name);

  constructor(private readonly database: Db) {}

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }: Partial<TelegramMessageData>): Promise<void> {
    try {
      const userCollection = this.database.collection(COLLECTIONS.USER);
      const user = { telegramUserId, chatId, firstName, lastName, username, createdAt: new Date() };
      await userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(`${this.saveUserDetails.name} - err: ${getErrorMessage(err)}`);
    }
  }

  async getUserDetails({ chatId }): Promise<any> {
    try {
      const userCollection = this.database.collection(COLLECTIONS.USER);
      return userCollection.findOne({ chatId });
    } catch (err) {
      this.logger.error(`${this.getUserDetails.name} - err: ${getErrorMessage(err)}`);
      return null;
    }
  }
}
