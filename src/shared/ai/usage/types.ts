import type { ObjectId } from 'mongodb';

export type UsageRecord = {
  readonly _id?: ObjectId;
  readonly source: string; // which bot/feature produced this usage (e.g. 'chatbot', 'chilli', 'secretary')
  readonly chatId?: number; // omitted for system/background calls with no user context
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
  readonly source: string;
  readonly chatId: number | null;
  readonly day: string; // YYYY-MM-DD in DEFAULT_TIMEZONE
  readonly turns: number;
  readonly tokensTotal: number;
  readonly cost: number;
};

export type AggregateUsageOptions = {
  readonly source?: string;
  readonly chatId?: number;
  readonly from?: Date;
  readonly to?: Date;
};
