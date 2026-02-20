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
  readonly voiceFileName: string | null;
  readonly conversation: SelfieEventConversation;
  readonly sender: SelfieEventSender | null;
  readonly createdAt: Date;
};

export type CreateSelfieEventData = Omit<SelfieEvent, '_id' | 'createdAt'>;
