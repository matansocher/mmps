import { PinModel } from '@core/mongo/shared/models';
import { COLLECTIONS, CONNECTION_NAME } from '@core/mongo/pin-buddy/pin-buddy-mongo.config';
import { Db, Document, ObjectId, WithId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@services/utils/utils.service';

@Injectable()
export class PinBuddyMongoPinService {
  constructor(
    @Inject(CONNECTION_NAME) private readonly db: Db,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getPins(chatId: number = null): Promise<PinModel[]> {
    try {
      const pinCollection = this.db.collection(COLLECTIONS.PIN);
      const filter = { isActive: true };
      if (chatId) filter['chatId'] = chatId;
      const cursor = pinCollection.find(filter);
      return this.getMultipleResults(cursor);
    } catch (err) {
      this.logger.error(this.getPins.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  async getPin(chatId: number = null, messageId: number): Promise<WithId<Document>> {
    const pinCollection = this.db.collection(COLLECTIONS.PIN);
    const filter = { chatId, messageId, isActive: true };
    return pinCollection.findOne(filter);
  }

  async addPin(chatId: number, messageId: number, title: string) {
    const pinCollection = this.db.collection(COLLECTIONS.PIN);
    const pinToSave = {
      chatId,
      messageId,
      title,
      isActive: true,
      createdAt: new Date(),
    };
    return pinCollection.insertOne(pinToSave);
  }

  archivePin(chatId: number, messageId: number) {
    const pinCollection = this.db.collection(COLLECTIONS.PIN);
    const filter = { chatId, messageId, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return pinCollection.updateOne(filter, updateObj);
  }

  async getMultipleResults(cursor: any) {
    const results = [];
    for await (const doc of cursor) {
      results.push(doc);
    }
    return results;
  }
}
