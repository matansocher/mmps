import type { ObjectId } from 'mongodb';

export interface DayDetailsModel {
  _id?: ObjectId;
  conversationId: string;
  date: string; // ISO date format (e.g., '2024-12-23')
  conversationName: string;
  messageCount: number;
}
