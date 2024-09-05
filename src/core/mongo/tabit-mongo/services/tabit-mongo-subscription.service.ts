import { IUserFlowDetails, IUserSelections } from '@services/tabit/interface';
import { Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { SubscriptionModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../tabit-mongo.config';
import { UtilsService } from '@core/utils/utils.service';

@Injectable()
export class TabitMongoSubscriptionService {
  private subscriptionCollection;

  constructor(
    @Inject(CONNECTION_NAME) private readonly db: Db,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  async getActiveSubscriptions(chatId: number = null): Promise<SubscriptionModel[]> {
    try {
      const filter = { isActive: true };
      if (chatId) filter['chatId'] = chatId;
      const cursor = this.subscriptionCollection.find(filter);
      return this.getMultipleResults(cursor);
    } catch (err) {
      this.logger.error(this.getActiveSubscriptions.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  async getSubscription(chatId: number, subscriptionId: string) {
    const filter = { chatId, _id: new ObjectId(subscriptionId), isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number, userFlowDetails: IUserFlowDetails) {
    const { restaurantDetails } = userFlowDetails;
    const { numOfSeats, date, time, area } = userFlowDetails;
    const userSelections: IUserSelections = { numOfSeats, date, time, area };

    const subscription = {
      chatId,
      userSelections,
      restaurantDetails,
      isActive: true,
      createdAt: new Date(),
    };
    return this.subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number, subscriptionId: ObjectId) {
    const filter = { chatId, _id: new ObjectId(subscriptionId.toString()), isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }

  async getExpiredSubscriptions() {
    const filter = { isActive: true, createdAt: { $gt: new Date() } };
    const cursor = this.subscriptionCollection.find(filter);
    return this.getMultipleResults(cursor);
  }

  async getMultipleResults(cursor: any) {
    const results = [];
    for await (const doc of cursor) {
      results.push(doc);
    }
    return results;
  }
}
