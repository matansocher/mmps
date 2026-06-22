import type { ObjectId } from 'mongodb';

export type SelfieEventConversation = {
  readonly id: string;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
};

export type SelfieEventSender = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
};

export type SelfieEvent = {
  readonly _id?: ObjectId;
  readonly messageId: string;
  readonly text: string | null;
  readonly date: Date;
  readonly isVoice: boolean;
  readonly conversation: SelfieEventConversation;
  readonly sender: SelfieEventSender | null;
  readonly createdAt: Date;
};

export type CreateSelfieEventData = Omit<SelfieEvent, '_id' | 'createdAt'>;

export type SelfieDailyStat = {
  readonly _id?: ObjectId;
  readonly date: string; // Format: "YYYY-MM-DD" (project timezone)
  readonly conversationId: string;
  readonly conversationName: string;
  readonly type: 'channel' | 'chat';
  readonly count: number;
  readonly createdAt: Date;
};

export type CreateSelfieDailyStat = Omit<SelfieDailyStat, '_id' | 'createdAt'>;
