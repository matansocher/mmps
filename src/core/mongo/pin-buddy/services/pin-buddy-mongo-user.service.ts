import { COLLECTIONS, CONNECTION_NAME } from '@core/mongo/pin-buddy/pin-buddy-mongo.config';
import { ITelegramMessageData } from '@services/telegram/interface';
import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';

@Injectable()
export class PinBuddyMongoUserService {
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
