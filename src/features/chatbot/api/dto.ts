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

export type ExpenseTypeDto = 'receipt' | 'card_alert' | 'bill';

export type ExpenseDto = {
  readonly id: string;
  readonly vendor: string;
  readonly category: ExpenseCategoryDto;
  readonly amount: number;
  readonly currency: string;
  readonly type: ExpenseTypeDto;
  readonly transactionDate: string; // ISO
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

export type ExpenseDailyPoint = {
  readonly date: string; // YYYY-MM-DD
  readonly total: number;
};

export type ExpensesMonthResponse = {
  readonly month: string; // YYYY-MM
  readonly expenses: ReadonlyArray<ExpenseDto>; // ALL expenses of the month, sorted DESC by transactionDate
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly byCategory: ReadonlyArray<ExpenseCategoryBreakdown>;
  readonly byType: ReadonlyArray<ExpenseTypeBreakdown>;
  // Trailing 14 days within the selected month (clamped to today for the current month and to first-of-month at the start)
  readonly daily: ReadonlyArray<{ readonly currency: string; readonly points: ReadonlyArray<ExpenseDailyPoint> }>;
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
};
