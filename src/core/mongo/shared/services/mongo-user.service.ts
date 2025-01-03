import { Db } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { ITelegramMessageData } from '@services/telegram';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoUserService {
  constructor(
    private readonly database: Db,
    private readonly logger: LoggerService,
    private readonly utils: UtilsService,
  ) {}

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const userCollection = this.database.collection(COLLECTIONS.USER);
      const user = { telegramUserId, chatId, firstName, lastName, username, createdAt: new Date() };
      await userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(this.saveUserDetails.name, `err: ${this.utils.getErrorMessage(err)}`);
    }
  }

  async getUserDetails({ chatId }): Promise<any> {
    try {
      const userCollection = this.database.collection(COLLECTIONS.USER);
      return userCollection.findOne({ chatId });
    } catch (err) {
      this.logger.error(this.getUserDetails.name, `err: ${this.utils.getErrorMessage(err)}`);
      return null;
    }
  }
}
