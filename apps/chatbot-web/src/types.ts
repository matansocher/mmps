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

export type ExpenseDto = {
  readonly id: string;
  readonly vendor: string;
  readonly category: ExpenseCategory;
  readonly amount: number;
  readonly currency: string;
  readonly type: ExpenseType;
  readonly transactionDate: string;
  readonly notes?: string;
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

export type ExpenseDailyPoint = {
  readonly date: string;
  readonly total: number;
};

export type ExpenseDailySeries = {
  readonly currency: string;
  readonly points: ReadonlyArray<ExpenseDailyPoint>;
};

export type ExpensesMonthResponse = {
  readonly month: string; // YYYY-MM
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly byCategory: ReadonlyArray<ExpenseCategoryBreakdown>;
  readonly byType: ReadonlyArray<ExpenseTypeBreakdown>;
  readonly daily: ReadonlyArray<ExpenseDailySeries>;
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

export type ExerciseResponse = {
  readonly activity: ActivitySummary;
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
