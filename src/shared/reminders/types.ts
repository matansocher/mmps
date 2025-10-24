import type { ObjectId } from 'mongodb';

export type ReminderStatus = 'pending' | 'completed' | 'snoozed';

export type Reminder = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly message: string;
  readonly dueDate: Date;
  readonly status: ReminderStatus;
  readonly createdAt: Date;
  readonly completedAt?: Date;
  readonly snoozedUntil?: Date;
};

export type CreateReminderData = {
  readonly chatId: number;
  readonly message: string;
  readonly dueDate: Date;
};

export type UpdateReminderData = {
  message?: string;
  dueDate?: Date;
  status?: ReminderStatus;
  completedAt?: Date;
  snoozedUntil?: Date;
};
