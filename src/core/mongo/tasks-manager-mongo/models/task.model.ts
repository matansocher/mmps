import type { ObjectId } from 'mongodb';

export enum INTERVAL_UNITS {
  HOUR = 'h',
  DAY = 'd',
  WEEK = 'w',
  MONTH = 'm',
};

export interface TaskModel {
  _id: ObjectId;
  chatId: number;
  title: string;
  intervalUnits: INTERVAL_UNITS | string;
  intervalAmount: number;
  lastNotifiedAt?: Date;
  isCompleted?: boolean;
  completedAt?: Date;
  createdAt: Date;
}
