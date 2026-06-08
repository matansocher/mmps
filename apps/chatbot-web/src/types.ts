export type EventDto = {
  readonly id: string;
  readonly summary: string;
  readonly start: string;
  readonly end?: string;
  readonly isAllDay: boolean;
  readonly isBirthday: boolean;
  readonly location?: string;
};

export type ReminderStatus = 'pending' | 'snoozed' | 'completed';

export type ReminderDto = {
  readonly id: string;
  readonly message: string;
  readonly dueDate: string;
  readonly status: ReminderStatus;
  readonly snoozedUntil?: string;
};

export type WeatherSnapshot = {
  readonly now: {
    readonly tempC: number;
    readonly feelsLike: number;
    readonly condition: string;
    readonly conditionCode: number;
    readonly location: string;
  } | null;
  readonly tomorrow: {
    readonly high: number;
    readonly low: number;
    readonly condition: string;
    readonly conditionCode: number;
    readonly chanceOfRain: number;
  } | null;
};

export type HeatmapDay = {
  readonly date: string;
  readonly done: boolean;
  readonly future: boolean;
};

export type ActivitySummary = {
  readonly todayDone: boolean;
  readonly heatmap: ReadonlyArray<HeatmapDay>;
};

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

export type ExpenseType = 'receipt' | 'card_alert' | 'bill';

export type ExpenseDto = {
  readonly id: string;
  readonly vendor: string;
  readonly category: ExpenseCategory;
  readonly amount: number;
  readonly currency: string;
  readonly type: ExpenseType;
  readonly transactionDate: string;
  readonly notes?: string;
  readonly card?: string;
  readonly originalVendor?: string;
  readonly originalCategory?: ExpenseCategory;
  readonly originalType?: ExpenseType;
};

export type ExpenseTotal = {
  readonly currency: string;
  readonly total: number;
};

export type ExpenseCategoryBreakdown = {
  readonly category: ExpenseCategory;
  readonly currency: string;
  readonly total: number;
  readonly count: number;
};

export type ExpenseTypeBreakdown = {
  readonly type: ExpenseType;
  readonly currency: string;
  readonly total: number;
  readonly count: number;
};

export type ExpensePacePrimary = {
  readonly currency: string;
  readonly currentTotal: number;
  readonly projectedTotal: number | null;
  readonly throughDayOfMonth: number;
  readonly daysInMonth: number;
  readonly comparableHistoricToDate: number | null;
  readonly historicAvgMonthlyTotal: number | null;
  readonly percentVsHistoric: number | null;
  readonly baselineMonthCount: number;
  readonly isCurrentMonth: boolean;
};

export type ExpenseTrajectoryPoint = {
  readonly day: number;
  readonly actual: number | null;
  readonly expected: number | null;
};

export type ExpenseCategoryDelta = {
  readonly category: ExpenseCategory;
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
  readonly category: ExpenseCategory;
  readonly card?: string;
};

export type ExpensesMonthResponse = {
  readonly month: string; // YYYY-MM
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly byCategory: ReadonlyArray<ExpenseCategoryBreakdown>;
  readonly byType: ReadonlyArray<ExpenseTypeBreakdown>;
  readonly pace: ExpensePacePrimary;
  readonly trajectory: ReadonlyArray<ExpenseTrajectoryPoint>;
  readonly categoryDeltas: ReadonlyArray<ExpenseCategoryDelta>;
  readonly topCharges: ReadonlyArray<ExpenseChargeDto>;
};

export type UpdateExpenseBody = {
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategory | null;
  readonly userType?: ExpenseType | null;
};

export type DashboardResponse = {
  readonly date: string;
  readonly isToday: boolean;
  readonly weather: WeatherSnapshot | null;
  readonly birthdays: ReadonlyArray<EventDto>;
  readonly events: ReadonlyArray<EventDto>;
  readonly reminders: ReadonlyArray<ReminderDto>;
  readonly activity: ActivitySummary;
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly expenseTotals: ReadonlyArray<ExpenseTotal>;
};

export type ExerciseLogResponse = {
  readonly logged: boolean;
  readonly alreadyDoneToday: boolean;
};

export type CreateReminderBody = {
  readonly message: string;
  readonly dueDate: string;
};

export type UpdateReminderBody = {
  readonly message?: string;
  readonly dueDate?: string;
  readonly status?: 'completed' | 'pending';
  readonly snoozeMinutes?: number;
};

export type CreateManualExpenseBody = {
  readonly vendor: string;
  readonly amount: number;
  readonly currency?: 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY';
  readonly transactionDate?: string;
  readonly category?: ExpenseCategory;
  readonly card?: string;
};

export type ExpenseMonthlyPoint = {
  readonly month: string;
  readonly total: number;
};

export type ExpenseCategoryDetailResponse = {
  readonly category: ExpenseCategory;
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
  readonly dominantCategory: { readonly category: ExpenseCategory; readonly share: number } | null;
  readonly monthlyTotals: ReadonlyArray<ExpenseMonthlyPoint>;
  readonly expenses: ReadonlyArray<ExpenseDto>;
};

export type BulkUpdateVendorBody = {
  readonly name: string;
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategory | null;
};

export type BulkUpdateVendorResponse = {
  readonly modifiedCount: number;
  readonly vendor: ExpenseVendorDetailResponse;
};
