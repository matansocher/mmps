import type { ObjectId } from 'mongodb';

export type Subscription = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
};

export type StockHolding = {
  readonly symbol: string;
  readonly name: string;
  readonly quantity: number;
  readonly buyPrice: number;
  readonly purchaseDate: Date;
};

export type Portfolio = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly balance: number;
  readonly holdings: StockHolding[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export const INITIAL_BALANCE = 10000;
