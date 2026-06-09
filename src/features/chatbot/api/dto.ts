export type EventDto = {
  readonly id: string;
  readonly summary: string;
  readonly start: string; // ISO 8601 or YYYY-MM-DD for all-day
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
  readonly date: string; // YYYY-MM-DD
  readonly done: boolean;
  readonly future: boolean;
};

export type ActivitySummary = {
  readonly todayDone: boolean;
  readonly heatmap: ReadonlyArray<HeatmapDay>;
};

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
  // Comparable historic (averaged across baseline months, MTD-normalized when current month is in progress).
  readonly comparableHistoricAvg: number | null;
  readonly percentVsHistoric: number | null;
};

// One of the biggest single charges in the selected month, primary currency only.
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
  readonly currency: string; // primary currency used by categoryDeltas/topCharges
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly byCategory: ReadonlyArray<ExpenseCategoryBreakdown>;
  readonly byType: ReadonlyArray<ExpenseTypeBreakdown>;
  // Per-category breakdown; deltas vs trailing-3-month baseline (null in all-time).
  readonly categoryDeltas: ReadonlyArray<ExpenseCategoryDelta>;
  // Top single charges, sorted by amount desc, primary currency only.
  readonly topCharges: ReadonlyArray<ExpenseChargeDto>;
};

export type UpdateExpenseBody = {
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategoryDto | null;
  readonly userType?: ExpenseTypeDto | null;
};

export type DashboardResponse = {
  readonly date: string; // YYYY-MM-DD, the selected date
  readonly isToday: boolean;
  readonly weather: WeatherSnapshot | null; // null when selected date is not today
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
  readonly transactionDate?: string; // ISO 8601; defaults to now
  readonly category?: ExpenseCategoryDto;
  readonly card?: string; // 4-digit last4; optional
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
  readonly month: string | null; // YYYY-MM when scope is 'month'
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
