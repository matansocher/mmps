import { DayDetailsModel } from '@core/mongo/selfie-mongo';
import { Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { COLLECTIONS, CONNECTION_NAME } from '../selfie-mongo.config';

@Injectable()
export class SelfieMongoDayDetailsService {
  private dayDetailsCollection;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    @Inject(CONNECTION_NAME) private readonly db: Db,
  ) {
    this.dayDetailsCollection = this.db.collection(COLLECTIONS.DAY_DETAILS);
  }

  async incrementDateItemsCount(conversationId: string, conversationName: string, date: string): Promise<DayDetailsModel> {
    try {
      return this.dayDetailsCollection.findOneAndUpdate(
        { conversationId, date },
        {
          $inc: { messageCount: 1 },
          $setOnInsert: { conversationName },
        },
        { upsert: true, new: true },
      );
    } catch (err) {
      this.logger.error(this.incrementDateItemsCount.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  getDateItems(date: string): Promise<DayDetailsModel[]> {
    try {
      return this.dayDetailsCollection.find({ date }).sort({ messageCount: -1 }).toArray();
    } catch (err) {
      this.logger.error(this.getDateItems.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
