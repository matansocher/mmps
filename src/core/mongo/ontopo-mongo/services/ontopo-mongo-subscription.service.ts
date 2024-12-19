import { Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { isProd } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { IUserFlowDetails, IUserSelections } from '@services/ontopo';
import { SubscriptionModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../ontopo-mongo.config';

@Injectable()
export class OntopoMongoSubscriptionService {
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
      if (!isProd) filter['chatId'] = MY_USER_ID;
      return this.subscriptionCollection.find(filter).toArray();
    } catch (err) {
      this.logger.error(this.getActiveSubscriptions.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  async getSubscriptionsCount(chatId: number): Promise<number> {
    try {
      return this.subscriptionCollection.count({ chatId });
    } catch (err) {
      this.logger.error(this.getSubscriptionsCount.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return 0;
    }
  }

  getSubscription(chatId: number, subscriptionId: string) {
    const filter = { chatId, _id: new ObjectId(subscriptionId), isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number, userFlowDetails: IUserFlowDetails): Promise<SubscriptionModel> {
    const { restaurantDetails } = userFlowDetails;
    const { size, date, time, area } = userFlowDetails;
    const userSelections: IUserSelections = { size, date, time, area };

    const subscription = {
      chatId,
      userSelections,
      restaurantDetails,
      isActive: true,
      createdAt: new Date(),
    };
    const { insertedId } = await this.subscriptionCollection.insertOne(subscription);
    return {
      _id: insertedId,
      ...subscription,
    };
  }

  archiveSubscription(chatId: number, subscriptionId: ObjectId) {
    const filter = { chatId, _id: new ObjectId(subscriptionId.toString()), isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }

  getExpiredSubscriptions() {
    const filter = { isActive: true, 'userSelections.date': { $lt: new Date() } };
    if (!isProd) filter['chatId'] = MY_USER_ID;
    return this.subscriptionCollection.find(filter).toArray();
  }
}
