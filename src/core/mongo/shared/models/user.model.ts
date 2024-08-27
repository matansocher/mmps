import type { ObjectId } from 'mongodb';

export interface UserModel {
  _id?: ObjectId;
  telegramUserId: number;
  chatId: number;
  firstName: string;
  lastName: string;
  username: string;
  createAt: Date;
}
