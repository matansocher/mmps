import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateFlightSubscriptionData, FlightSubscription } from '../types';
import { DB_NAME } from './index';

function getCollection() {
  return getMongoCollection<FlightSubscription>(DB_NAME, 'Subscription');
}

export async function getActiveFlightSubscriptions(): Promise<FlightSubscription[]> {
  return getCollection().find({ isActive: true }).toArray();
}

export async function getActiveFlightSubscriptionsByChatId(chatId: number): Promise<FlightSubscription[]> {
  return getCollection().find({ chatId, isActive: true }).toArray();
}

export async function getFlightSubscription(countryName: string, chatId: number): Promise<FlightSubscription | null> {
  return getCollection().findOne({ countryName, chatId, isActive: true });
}

export async function createFlightSubscription(data: CreateFlightSubscriptionData): Promise<InsertOneResult<FlightSubscription>> {
  const subscription: Omit<FlightSubscription, '_id'> = {
    chatId: data.chatId,
    countryName: data.countryName,
    countryEmoji: data.countryEmoji,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return getCollection().insertOne(subscription as FlightSubscription);
}

export async function removeFlightSubscription(countryName: string, chatId: number): Promise<UpdateResult> {
  return getCollection().updateOne({ countryName, chatId, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}

export async function getFlightSubscriptionsGroupedByChatId(): Promise<Map<number, FlightSubscription[]>> {
  const subscriptions = await getActiveFlightSubscriptions();
  const grouped = new Map<number, FlightSubscription[]>();

  for (const subscription of subscriptions) {
    const existing = grouped.get(subscription.chatId) || [];
    existing.push(subscription);
    grouped.set(subscription.chatId, existing);
  }

  return grouped;
}
