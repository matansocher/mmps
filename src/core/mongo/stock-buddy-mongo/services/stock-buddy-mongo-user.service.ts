import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { ITelegramMessageData } from '@services/telegram/interface';
import { COLLECTIONS, CONNECTION_NAME } from '../stock-buddy-mongo.config';

@Injectable()
export class StockBuddyMongoUserService {
  constructor(
    @Inject(CONNECTION_NAME) private readonly db: Db,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }: Partial<ITelegramMessageData>): Promise<any> {
    try {
      const userCollection = this.db.collection(COLLECTIONS.USER);
      const user = { telegramUserId, chatId, firstName, lastName, username };
      await userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(this.saveUserDetails.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
