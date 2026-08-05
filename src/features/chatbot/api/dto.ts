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

export type DashboardResponse = {
  readonly date: string; // YYYY-MM-DD, the selected date
  readonly isToday: boolean;
  readonly birthdays: ReadonlyArray<EventDto>;
  readonly events: ReadonlyArray<EventDto>;
  readonly reminders: ReadonlyArray<ReminderDto>;
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

export type CreateEventBody = {
  readonly summary: string;
  readonly start: string; // ISO 8601 date-time
  readonly end: string; // ISO 8601 date-time
  readonly location?: string;
};

export type UsageResponse = {
  readonly days: number;
  readonly totals: { readonly cost: number; readonly turns: number; readonly tokensTotal: number };
  readonly perDay: ReadonlyArray<{ readonly day: string; readonly cost: number; readonly turns: number; readonly tokensTotal: number }>;
  readonly perSource: ReadonlyArray<{ readonly source: string; readonly cost: number; readonly turns: number; readonly tokensTotal: number }>;
};

export type EmailDto = {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly snippet: string;
};

export type UnreadEmailsResponse = {
  readonly emails: ReadonlyArray<EmailDto>;
};

export type FullEmailDto = {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly date: string;
  readonly bodyText: string;
};

export type UpcomingBirthdayDto = {
  readonly id: string;
  readonly summary: string;
  readonly date: string; // YYYY-MM-DD
  readonly inDays: number;
};

export type UpcomingBirthdaysResponse = {
  readonly birthdays: ReadonlyArray<UpcomingBirthdayDto>;
};
