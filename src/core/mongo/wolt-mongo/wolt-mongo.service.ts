import { AnalyticLogModel, SubscriptionModel, UserModel } from '@core/mongo/shared/models';
import { ITelegramMessageData } from '@services/telegram/interface';
import { MongoClient } from 'mongodb';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@services/utils/utils.service';
import { Subscription } from 'rxjs';
import * as mongoConfig from './wolt-mongo.config';
import { isProd } from '@core/config/main.config';

@Injectable()
export class WoltMongoService implements OnModuleInit {
  private client: MongoClient = new MongoClient(mongoConfig.MONGO_DB_URL);

  subscriptionCollection;
  userCollection;
  analyticLogCollection;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  onModuleInit(): void {
    this.connectToMongo();
  }

  async connectToMongo(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info(this.connectToMongo.name, 'Connected successfully to mongo server');

      const DB = this.client.db(mongoConfig.WOLT.NAME);
      this.subscriptionCollection = DB.collection(mongoConfig.WOLT.COLLECTIONS.SUBSCRIPTIONS);
      this.userCollection = DB.collection(mongoConfig.WOLT.COLLECTIONS.USER);
      this.analyticLogCollection = DB.collection(mongoConfig.WOLT.COLLECTIONS.ANALYTIC_LOGS);
    } catch (err) {
      this.logger.error(this.connectToMongo.name, `Failed to connect to mongo server - error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
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

  async getSubscription(chatId: number, restaurant: string): Promise<SubscriptionModel> {
    const filter = { chatId, restaurant, isActive: true };
    return this.subscriptionCollection.findOne(filter);
  }

  async addSubscription(chatId: number, restaurant: string, restaurantPhoto: string): Promise<SubscriptionModel> {
    const subscription = {
      chatId,
      restaurant,
      restaurantPhoto,
      isActive: true,
      createdAt: new Date(),
    };
    return this.subscriptionCollection.insertOne(subscription);
  }

  archiveSubscription(chatId: number, restaurant: string): Promise<SubscriptionModel> {
    const filter = { chatId, restaurant, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.subscriptionCollection.updateOne(filter, updateObj);
  }

  async getExpiredSubscriptions(subscriptionExpirationHours: number): Promise<SubscriptionModel[]> {
    const validLimitTimestamp = new Date().getTime() - subscriptionExpirationHours * 60 * 60 * 1000;
    const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
    const cursor = this.subscriptionCollection.find(filter);
    return this.getMultipleResults(cursor);
  }

  async getMultipleResults(cursor: any): Promise<any[]> {
    const results = [];
    for await (const doc of cursor) {
      results.push(doc);
    }
    return results;
  }

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }: Partial<ITelegramMessageData>): Promise<UserModel> {
    try {
      const existingUser = await this.userCollection.findOne({ telegramUserId });
      if (existingUser) {
        return;
      }
      const user = { telegramUserId, chatId, firstName, lastName, username };
      return this.userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(this.saveUserDetails.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  sendAnalyticLog(eventName: string, { chatId, data = null }): Promise<AnalyticLogModel> {
    if (!isProd) {
      return;
    }
    const log = {
      chatId,
      data,
      eventName,
      // message,
      // error,
      createdAt: new Date(),
    };
    return this.analyticLogCollection.insertOne(log);
  }
}
