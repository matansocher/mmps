import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateGameFollowData, GameFollow, UpdateReleaseInfoData } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<GameFollow>(DB_NAME, 'Follow');
}

export async function getActiveFollows(): Promise<GameFollow[]> {
  return getCollection().find({ isActive: true }).toArray();
}

export async function getActiveFollowsByChatId(chatId: number): Promise<GameFollow[]> {
  return getCollection().find({ chatId, isActive: true }).toArray();
}

export async function getFollow(chatId: number, igdbId: number): Promise<GameFollow | null> {
  return getCollection().findOne({ chatId, igdbId, isActive: true });
}

export async function createFollow(data: CreateGameFollowData): Promise<InsertOneResult<GameFollow>> {
  const follow: Omit<GameFollow, '_id'> = {
    ...data,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return getCollection().insertOne(follow as GameFollow);
}

export async function updateReleaseInfo(chatId: number, igdbId: number, data: UpdateReleaseInfoData): Promise<UpdateResult> {
  return getCollection().updateOne({ chatId, igdbId, isActive: true }, { $set: { ...data, updatedAt: new Date() } });
}

export async function removeFollow(chatId: number, igdbId: number): Promise<UpdateResult> {
  return getCollection().updateOne({ chatId, igdbId, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}
