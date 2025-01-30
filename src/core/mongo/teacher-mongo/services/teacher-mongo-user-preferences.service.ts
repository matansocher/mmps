import { Collection, Db, InsertOneResult, ObjectId, UpdateResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { UserPreferencesModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../teacher-mongo.config';

@Injectable()
export class TeacherMongoUserPreferencesService {
  private readonly userPreferencesCollection: Collection<UserPreferencesModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.userPreferencesCollection = this.db.collection(COLLECTIONS.USER_PREFERENCES);
  }

  getUserPreference(userId: number): Promise<UserPreferencesModel> {
    const filter = { userId };
    return this.userPreferencesCollection.findOne(filter);
  }

  createUserPreference(userId: number): Promise<InsertOneResult<UserPreferencesModel>> {
    const userPreference = {
      _id: new ObjectId(),
      userId,
      isStopped: false,
      createdAt: new Date(),
    };
    return this.userPreferencesCollection.insertOne(userPreference);
  }

  updateUserPreference(userId: number, update: Partial<UserPreferencesModel>): Promise<UpdateResult<UserPreferencesModel>> {
    const filter = { userId };
    const updateObj = { $set: update };
    return this.userPreferencesCollection.updateOne(filter, updateObj);
  }
}
