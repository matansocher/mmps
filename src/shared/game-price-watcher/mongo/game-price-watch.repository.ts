import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateGamePriceWatchData, GamePriceWatch } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<GamePriceWatch>(DB_NAME, 'Watch');
}

export async function getActiveWatches(): Promise<GamePriceWatch[]> {
  return getCollection().find({ isActive: true }).toArray();
}

export async function getActiveWatchesByChatId(chatId: number): Promise<GamePriceWatch[]> {
  return getCollection().find({ chatId, isActive: true }).toArray();
}

export async function getWatch(chatId: number, conceptId: string): Promise<GamePriceWatch | null> {
  return getCollection().findOne({ chatId, conceptId, isActive: true });
}

export async function createWatch(data: CreateGamePriceWatchData): Promise<InsertOneResult<GamePriceWatch>> {
  const watch: Omit<GamePriceWatch, '_id'> = {
    ...data,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return getCollection().insertOne(watch as GamePriceWatch);
}

export async function updateLowestPrice(chatId: number, conceptId: string, lowestPrice: number): Promise<UpdateResult> {
  return getCollection().updateOne({ chatId, conceptId, isActive: true }, { $set: { lowestPrice, updatedAt: new Date() } });
}

export async function removeWatch(chatId: number, conceptId: string): Promise<UpdateResult> {
  return getCollection().updateOne({ chatId, conceptId, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}
