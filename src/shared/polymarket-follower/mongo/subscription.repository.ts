import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateSubscriptionData, Subscription, UpdateSubscriptionData } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<Subscription>(DB_NAME, 'Subscription');
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.find({ isActive: true }).toArray();
}

export async function getActiveSubscriptionsByChatId(chatId: number): Promise<Subscription[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.find({ chatId, isActive: true }).toArray();
}

export async function getSubscription(marketId: string, chatId: number): Promise<Subscription | null> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.findOne({ marketId, chatId, isActive: true });
}

export async function getSubscriptionBySlug(marketSlug: string, chatId: number): Promise<Subscription | null> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.findOne({ marketSlug, chatId, isActive: true });
}

export async function createSubscription(data: CreateSubscriptionData): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = getCollection();
  const subscription: Omit<Subscription, '_id'> = {
    marketId: data.marketId,
    marketSlug: data.marketSlug,
    marketQuestion: data.marketQuestion,
    chatId: data.chatId,
    lastNotifiedPrice: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return subscriptionCollection.insertOne(subscription as Subscription);
}

export async function updateSubscription(marketId: string, chatId: number, data: UpdateSubscriptionData): Promise<UpdateResult> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ marketId, chatId, isActive: true }, { $set: { ...data, updatedAt: new Date() } });
}

export async function removeSubscription(marketId: string, chatId: number): Promise<UpdateResult> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ marketId, chatId, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}

export async function getSubscriptionsGroupedByChatId(): Promise<Map<number, Subscription[]>> {
  const subscriptions = await getActiveSubscriptions();
  const grouped = new Map<number, Subscription[]>();

  for (const subscription of subscriptions) {
    const existing = grouped.get(subscription.chatId) || [];
    existing.push(subscription);
    grouped.set(subscription.chatId, existing);
  }

  return grouped;
}
