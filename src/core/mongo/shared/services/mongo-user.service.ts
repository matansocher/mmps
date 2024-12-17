import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { Injectable } from '@nestjs/common';
import { ITelegramMessageData } from '@services/telegram';
import { Db } from 'mongodb';
import { COLLECTIONS } from '../mongo.config';

@Injectable()
export class MongoUserService {
  constructor(
    private readonly database: Db,
    private readonly logger: LoggerService,
    private readonly utils: UtilsService,
  ) {}

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }: Partial<ITelegramMessageData>): Promise<any> {
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
