import { Collection, Db, InsertOneResult, ObjectId, UpdateResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { UserPreferencesModel } from '../models';

@Injectable()
export class EducatorMongoUserPreferencesService {
  private readonly userPreferencesCollection: Collection<UserPreferencesModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.userPreferencesCollection = this.db.collection(COLLECTIONS.USER_PREFERENCES);
  }

  getUserPreference(userId: number): Promise<UserPreferencesModel> {
    const filter = { userId };
    return this.userPreferencesCollection.findOne(filter);
  }

  async createUserPreference(userId: number): Promise<void> {
    const userPreferences = await this.userPreferencesCollection.findOne({ userId });
    if (userPreferences) {
      await this.updateUserPreference(userId, { isStopped: false });
      return;
    }

    const userPreference = {
      _id: new ObjectId(),
      userId,
      isStopped: false,
      createdAt: new Date(),
    };
    await this.userPreferencesCollection.insertOne(userPreference);
    return;
  }

  updateUserPreference(userId: number, update: Partial<UserPreferencesModel>): Promise<UpdateResult<UserPreferencesModel>> {
    const filter = { userId };
    const updateObj = { $set: update };
    return this.userPreferencesCollection.updateOne(filter, updateObj);
  }
}
