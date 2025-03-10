import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { UserPreferencesModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../trainer-mongo.config';

@Injectable()
export class TrainerMongoUserPreferencesService {
  private readonly userPreferencesCollection: Collection<UserPreferencesModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.userPreferencesCollection = this.db.collection(COLLECTIONS.USER_PREFERENCES);
  }

  getUserPreference(chatId: number): Promise<UserPreferencesModel> {
    const filter = { chatId };
    return this.userPreferencesCollection.findOne(filter);
  }

  getActiveUsers(): Promise<UserPreferencesModel[]> {
    const filter = { isStopped: false };
    return this.userPreferencesCollection.find(filter).toArray();
  }

  async createUserPreference(chatId: number): Promise<void> {
    const userPreferences = await this.userPreferencesCollection.findOne({ chatId });
    if (userPreferences) {
      await this.updateUserPreference(chatId, { isStopped: false });
      return;
    }

    const userPreference = {
      _id: new ObjectId(),
      chatId,
      isStopped: false,
      createdAt: new Date(),
    };
    await this.userPreferencesCollection.insertOne(userPreference);
    return;
  }

  async updateUserPreference(chatId: number, update: Partial<UserPreferencesModel>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: update };
    await this.userPreferencesCollection.updateOne(filter, updateObj);
    return;
  }
}
