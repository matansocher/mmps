import type { ObjectId } from 'mongodb';

export type FlightSubscription = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly countryName: string;
  readonly countryEmoji: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateFlightSubscriptionData = {
  readonly chatId: number;
  readonly countryName: string;
  readonly countryEmoji: string;
};
