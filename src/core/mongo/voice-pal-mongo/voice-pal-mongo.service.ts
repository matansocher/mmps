import { AnalyticLogModel, UserModel } from '@core/mongo/shared/models';
import { ITelegramMessageData } from '@services/telegram/interface';
import { Collection, MongoClient } from 'mongodb';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@services/utils/utils.service';
import * as mongoConfig from '@core/mongo/voice-pal-mongo/voice-pal-mongo.config';

@Injectable()
export class VoicePalMongoService implements OnModuleInit {
  private client: MongoClient = new MongoClient(mongoConfig.MONGO_DB_URL);

  userCollection: Collection<UserModel>;
  analyticLogCollection: Collection<AnalyticLogModel>;

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

      const DB = this.client.db(mongoConfig.VOICE_PAL.NAME);
      this.userCollection = DB.collection<UserModel>(mongoConfig.VOICE_PAL.COLLECTIONS.USER);
      this.analyticLogCollection = DB.collection<AnalyticLogModel>(mongoConfig.VOICE_PAL.COLLECTIONS.ANALYTIC_LOGS);
    } catch (err) {
      this.logger.error(this.connectToMongo.name, `Failed to connect to mongo server - error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }: Partial<ITelegramMessageData>): Promise<any> {
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

  sendAnalyticLog(eventName: string, { chatId, data = null, error = '' }): Promise<any> {
    const log = {
      chatId,
      data,
      eventName,
      ...(!!error && { error }),
      createdAt: new Date(),
    };
    return this.analyticLogCollection.insertOne(log);
  }
}
