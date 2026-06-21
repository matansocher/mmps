import type { ObjectId } from 'mongodb';

export type SecretaryMessage = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly fromOwner: boolean;
  readonly senderName?: string;
  readonly senderUsername?: string;
  readonly text: string;
  readonly transcribed: boolean;
  readonly createdAt: Date;
};

export type CreateSecretaryMessageData = Omit<SecretaryMessage, '_id' | 'createdAt'>;
