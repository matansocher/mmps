import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { UserPreferences } from '../models';

@Injectable()
export class EducatorMongoUserPreferencesService {
  private readonly userPreferencesCollection: Collection<UserPreferences>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.userPreferencesCollection = this.db.collection(COLLECTIONS.USER_PREFERENCES);
  }

  getUserPreference(chatId: number): Promise<UserPreferences> {
    const filter = { chatId };
    return this.userPreferencesCollection.findOne(filter);
  }

  getActiveUsers(): Promise<UserPreferences[]> {
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
  }

  async updateUserPreference(chatId: number, update: Partial<UserPreferences>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: update };
    await this.userPreferencesCollection.updateOne(filter, updateObj);
  }
}
