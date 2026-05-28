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

export type ExpenseItem = {
  readonly name: string;
  readonly qty: number;
  readonly price: number;
};

export type ExpenseSource = 'body' | 'pdf' | 'manual';

export type Expense = {
  readonly _id?: ObjectId;
  readonly messageId: string;
  readonly type: ExpenseType;
  readonly vendor: string;
  readonly category: ExpenseCategory;
  readonly userCategory?: ExpenseCategory;
  readonly amount: number;
  readonly currency: string;
  readonly emailDate: Date;
  readonly transactionDate?: Date;
  readonly items?: ReadonlyArray<ExpenseItem>;
  readonly notes?: string;
  readonly rawSubject: string;
  readonly rawFrom: string;
  readonly source: ExpenseSource;
  readonly createdAt: Date;
};

export type CreateExpenseData = Omit<Expense, '_id' | 'createdAt'>;

export type ProcessedEmailStatus = 'extracted' | 'not_expense' | 'error';

export type ProcessedEmail = {
  readonly _id?: ObjectId;
  readonly messageId: string;
  readonly status: ProcessedEmailStatus;
  readonly errorMessage?: string;
  readonly processedAt: Date;
};

export type SenderTemplate = {
  readonly _id?: ObjectId;
  readonly from: string;
  readonly hint: string;
  readonly successCount: number;
  readonly lastUpdated: Date;
};

export type DailySummary = {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
  readonly totals: ReadonlyArray<{ currency: string; total: number }>;
  readonly byCategory: ReadonlyArray<{ category: ExpenseCategory; total: number; currency: string }>;
  readonly expenses: ReadonlyArray<Expense>;
};
