import type { ObjectId } from 'mongodb';

export interface AnalyticLogModel {
  _id?: ObjectId;
  eventName: string;
  restaurant: string;
  isActive: boolean;
  createdAt: number;
}
