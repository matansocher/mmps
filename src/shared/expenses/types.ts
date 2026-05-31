import type { ObjectId } from 'mongodb';

export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'subscriptions'
  | 'utilities'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'bills'
  | 'other';

export type ExpenseType = 'receipt' | 'card_alert' | 'bill';

export const SUPPORTED_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'JPY'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'ILS';

export type Expense = {
  readonly _id?: ObjectId;
  readonly messageId: string;
  readonly type: ExpenseType;
  readonly vendor: string;
  readonly category: ExpenseCategory;
  readonly userCategory?: ExpenseCategory;
  readonly amount: number;
  readonly currency: string;
  readonly transactionDate: Date;
  readonly createdAt: Date;
};

export type CreateExpenseData = Omit<Expense, '_id' | 'createdAt'>;

export type DailySummary = {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
  readonly totals: ReadonlyArray<{ currency: string; total: number }>;
  readonly byCategory: ReadonlyArray<{ category: ExpenseCategory; total: number; currency: string }>;
  readonly expenses: ReadonlyArray<Expense>;
};
