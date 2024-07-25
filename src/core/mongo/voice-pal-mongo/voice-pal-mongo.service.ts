import { LoggerService } from '@core/logger/logger.service';
import * as mongoConfig from '@core/mongo/voice-pal-mongo/voice-pal-mongo.config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { UtilsService } from '@services/utils/utils.service';
import { MongoClient } from 'mongodb';
import { isProd } from '@core/config/main.config';

@Injectable()
export class VoicePalMongoService implements OnModuleInit {
  private client: MongoClient = new MongoClient(mongoConfig.MONGO_DB_URL);

  userCollection;
  analyticLogCollection;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  onModuleInit() {
    this.connectToMongo();
  }

  async connectToMongo() {
    try {
      await this.client.connect();
      this.logger.info(this.connectToMongo.name, 'Connected successfully to mongo server');

      const DB = this.client.db(mongoConfig.VOICE_PAL.NAME);
      this.userCollection = DB.collection(mongoConfig.VOICE_PAL.COLLECTIONS.USER);
      this.analyticLogCollection = DB.collection(mongoConfig.VOICE_PAL.COLLECTIONS.ANALYTIC_LOGS);
    } catch (err) {
      this.logger.error(this.connectToMongo.name, `Failed to connect to mongo server - error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }) {
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

  sendAnalyticLog(eventName, { chatId, data = null, error = '' }) {
    if (!isProd) {
      return;
    }
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
