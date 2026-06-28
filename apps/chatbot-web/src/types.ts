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

