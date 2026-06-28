export type ExpenseCategoryDto =
  | 'restaurants'
  | 'fast_food'
  | 'groceries'
  | 'fuel'
  | 'transport'
  | 'home'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'events'
  | 'travel'
  | 'communications'
  | 'insurance'
  | 'government'
  | 'subscriptions'
  | 'utilities'
  | 'bills'
  | 'other';

export type ExpenseTypeDto = 'receipt' | 'card_alert' | 'bill';

export type ExpenseDto = {
  readonly id: string;
  readonly vendor: string;
  readonly category: ExpenseCategoryDto;
  readonly amount: number;
  readonly currency: string;
  readonly type: ExpenseTypeDto;
  readonly transactionDate: string; // ISO
  readonly card?: string;
  readonly notes?: string;
  readonly originalVendor?: string;
  readonly originalCategory?: ExpenseCategoryDto;
  readonly originalType?: ExpenseTypeDto;
};

export type ExpenseTotal = {
  readonly currency: string;
  readonly total: number;
};

export type ExpenseCategoryBreakdown = {
  readonly category: ExpenseCategoryDto;
  readonly currency: string;
  readonly total: number;
  readonly count: number;
};

export type ExpenseTypeBreakdown = {
  readonly type: ExpenseTypeDto;
  readonly currency: string;
  readonly total: number;
  readonly count: number;
};

export type ExpenseCategoryDelta = {
  readonly category: ExpenseCategoryDto;
  readonly currency: string;
  readonly currentTotal: number;
  readonly currentCount: number;
  readonly comparableHistoricAvg: number | null;
  readonly percentVsHistoric: number | null;
};

export type ExpenseChargeDto = {
  readonly id: string;
  readonly vendor: string;
  readonly amount: number;
  readonly currency: string;
  readonly transactionDate: string;
  readonly category: ExpenseCategoryDto;
  readonly card?: string;
};

export type ExpensesMonthResponse = {
  readonly month: string; // YYYY-MM, or 'all' when scope is 'all'
  readonly scope: 'month' | 'all';
  readonly currency: string;
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly byCategory: ReadonlyArray<ExpenseCategoryBreakdown>;
  readonly byType: ReadonlyArray<ExpenseTypeBreakdown>;
  readonly categoryDeltas: ReadonlyArray<ExpenseCategoryDelta>;
  readonly topCharges: ReadonlyArray<ExpenseChargeDto>;
  readonly anomalyExpenseIds: ReadonlyArray<string>;
};

export type UpdateExpenseBody = {
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategoryDto | null;
  readonly userType?: ExpenseTypeDto | null;
  readonly notes?: string | null;
};

export const NOTES_MAX_LENGTH = 280;

export type CreateManualExpenseBody = {
  readonly vendor: string;
  readonly amount: number;
  readonly currency?: 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY';
  readonly transactionDate?: string;
  readonly category?: ExpenseCategoryDto;
  readonly card?: string;
};

export type CardListResponse = {
  readonly cards: ReadonlyArray<string>;
};

export type ExpenseMonthlyPoint = {
  readonly month: string; // YYYY-MM
  readonly total: number;
};

export type ExpenseCategoryDetailResponse = {
  readonly category: ExpenseCategoryDto;
  readonly scope: 'month' | 'all';
  readonly month: string | null;
  readonly currency: string;
  readonly total: number;
  readonly count: number;
  readonly avg: number;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly monthlyTotals: ReadonlyArray<ExpenseMonthlyPoint>;
  readonly topVendors: ReadonlyArray<{ readonly vendor: string; readonly total: number; readonly count: number }>;
  readonly expenses: ReadonlyArray<ExpenseDto>;
};

export type ExpenseVendorDetailResponse = {
  readonly vendor: string;
  readonly currency: string;
  readonly total: number;
  readonly count: number;
  readonly avg: number;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly dominantCategory: { readonly category: ExpenseCategoryDto; readonly share: number } | null;
  readonly monthlyTotals: ReadonlyArray<ExpenseMonthlyPoint>;
  readonly expenses: ReadonlyArray<ExpenseDto>;
};

export type BulkUpdateVendorBody = {
  readonly name: string;
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategoryDto | null;
};

export type BulkUpdateVendorResponse = {
  readonly modifiedCount: number;
  readonly vendor: ExpenseVendorDetailResponse;
};

export type SubscriptionDto = {
  readonly vendor: string;
  readonly category: ExpenseCategoryDto;
  readonly currency: string;
  readonly amount: number;
  readonly avgAmount: number;
  readonly cadenceDays: number;
  readonly monthlyEquivalent: number;
  readonly occurrences: number;
  readonly firstChargedAt: string; // YYYY-MM-DD
  readonly lastChargedAt: string; // YYYY-MM-DD
  readonly nextExpectedAt: string; // YYYY-MM-DD
};
