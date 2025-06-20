import type { ObjectId } from 'mongodb';

export interface User {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  readonly createAt: Date;
}
