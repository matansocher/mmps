import type { ObjectId } from 'mongodb';

export interface PinModel {
  _id: ObjectId;
  chatId: number;
  messageId: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
}
