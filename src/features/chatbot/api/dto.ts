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

export type ExpensePacePrimary = {
  readonly currency: string;
  // Spend so far in the selected month, in the primary currency
  readonly currentTotal: number;
  // For the current (in-progress) month, this is a projection. For past months it's null.
  readonly projectedTotal: number | null;
  // 1-based; the day-of-month we count "to-date" through (today for current month, last day for past months)
  readonly throughDayOfMonth: number;
  readonly daysInMonth: number;
  // Average of (sum of expenses in days 1..throughDayOfMonth) across baseline months
  readonly comparableHistoricToDate: number | null;
  // Average of full-month totals across baseline months
  readonly historicAvgMonthlyTotal: number | null;
  // (current vs comparableHistoricToDate) expressed as percent delta, e.g. +12 means 12% higher than typical
  readonly percentVsHistoric: number | null;
  // How many prior months we averaged over (1-3). 0 means no baseline available.
  readonly baselineMonthCount: number;
  // True when the selected month is the current calendar month
  readonly isCurrentMonth: boolean;
};

export type ExpenseTrajectoryPoint = {
  readonly day: number; // 1-31
  // Cumulative actual spend through this day. Null for future days of the current month.
  readonly actual: number | null;
  // Linear pace = historicAvgMonthlyTotal * (day / daysInMonth). Null when no baseline.
  readonly expected: number | null;
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
};

export type ExpensesMonthResponse = {
  readonly month: string; // YYYY-MM
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly totals: ReadonlyArray<ExpenseTotal>;
  readonly byCategory: ReadonlyArray<ExpenseCategoryBreakdown>;
  readonly byType: ReadonlyArray<ExpenseTypeBreakdown>;
  // Pace / "where I stand this month" — primary currency only.
  readonly pace: ExpensePacePrimary;
  // Cumulative actual + expected pace line for the selected month — primary currency only.
  readonly trajectory: ReadonlyArray<ExpenseTrajectoryPoint>;
  // Per-category breakdown enriched with delta vs trailing-3-month baseline.
  readonly categoryDeltas: ReadonlyArray<ExpenseCategoryDelta>;
  // Top 5 single charges this month, sorted by amount desc, primary currency only.
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
};
