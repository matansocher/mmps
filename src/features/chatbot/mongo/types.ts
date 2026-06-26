import type { ObjectId } from 'mongodb';

export type UsageRecord = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly model: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly tokensTotal: number;
  readonly cost: number; // USD
  readonly durationMs: number;
  readonly llmCalls: number;
  readonly toolCalls: number;
  readonly createdAt: Date;
};

export type SaveUsageData = Omit<UsageRecord, '_id' | 'createdAt'>;

export type UsageAggregateRow = {
  readonly chatId: number;
  readonly day: string; // YYYY-MM-DD in DEFAULT_TIMEZONE
  readonly turns: number;
  readonly tokensTotal: number;
  readonly cost: number;
};

export type AggregateUsageOptions = {
  readonly chatId?: number;
  readonly from?: Date;
  readonly to?: Date;
};
