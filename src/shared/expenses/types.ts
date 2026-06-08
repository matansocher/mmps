import type { ObjectId } from 'mongodb';

export const EXPENSE_CATEGORIES = [
  'restaurants',
  'fast_food',
  'groceries',
  'fuel',
  'transport',
  'home',
  'shopping',
  'health',
  'entertainment',
  'events',
  'travel',
  'communications',
  'insurance',
  'government',
  'subscriptions',
  'utilities',
  'bills',
  'transfer',
  'electronics',
  'books',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  restaurants: 'Restaurants',
  fast_food: 'Fast food',
  groceries: 'Groceries',
  fuel: 'Fuel',
  transport: 'Transport',
  home: 'Home',
  shopping: 'Shopping',
  health: 'Health',
  entertainment: 'Entertainment',
  events: 'Events',
  travel: 'Travel',
  communications: 'Communications',
  insurance: 'Insurance',
  government: 'Government',
  subscriptions: 'Subscriptions',
  utilities: 'Utilities',
  bills: 'Bills',
  transfer: 'Transfer',
  electronics: 'Electronics',
  books: 'Books',
  other: 'Other',
};

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  restaurants: '🍽️',
  fast_food: '🍔',
  groceries: '🛒',
  fuel: '⛽',
  transport: '🚗',
  home: '🛋️',
  shopping: '🛍️',
  health: '💊',
  entertainment: '🎬',
  events: '🎉',
  travel: '✈️',
  communications: '📡',
  insurance: '🛡️',
  government: '🏛️',
  subscriptions: '📅',
  utilities: '💡',
  bills: '🧾',
  transfer: '💸',
  electronics: '💻',
  books: '📚',
  other: '💳',
};

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
  readonly userVendor?: string;
  readonly userCategory?: ExpenseCategory;
  readonly userType?: ExpenseType;
  readonly amount: number;
  readonly currency: string;
  readonly card?: string; // last 4 digits of the source card; null for manual/cash entries
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
