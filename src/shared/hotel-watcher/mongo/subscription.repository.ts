import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateHotelWatchData, HotelWatch } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<HotelWatch>(DB_NAME, 'Watch');
}

export async function getActiveWatches(): Promise<HotelWatch[]> {
  return getCollection().find({ isActive: true }).toArray();
}

export async function getActiveWatchesByChatId(chatId: number): Promise<HotelWatch[]> {
  return getCollection().find({ chatId, isActive: true }).toArray();
}

export async function getWatch(chatId: number, hotelId: string, checkinDate: string, checkoutDate: string): Promise<HotelWatch | null> {
  return getCollection().findOne({ chatId, hotelId, checkinDate, checkoutDate, isActive: true });
}

export async function createWatch(data: CreateHotelWatchData): Promise<InsertOneResult<HotelWatch>> {
  const watch: Omit<HotelWatch, '_id'> = {
    ...data,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return getCollection().insertOne(watch as HotelWatch);
}

export async function updateLastPrice(chatId: number, hotelId: string, checkinDate: string, checkoutDate: string, lastPrice: number): Promise<UpdateResult> {
  return getCollection().updateOne({ chatId, hotelId, checkinDate, checkoutDate, isActive: true }, { $set: { lastPrice, updatedAt: new Date() } });
}

export async function removeWatch(chatId: number, hotelId: string, checkinDate: string, checkoutDate: string): Promise<UpdateResult> {
  return getCollection().updateOne({ chatId, hotelId, checkinDate, checkoutDate, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}
