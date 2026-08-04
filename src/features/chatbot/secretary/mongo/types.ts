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

export type SecretaryActionType = 'calendar' | 'reminder';

export type SecretaryActionStatus = 'pending' | 'done' | 'failed';

// A concrete, one-tap action extracted from a daily summary (calendar event or reminder).
export type SecretarySummaryAction = {
  readonly type: SecretaryActionType;
  readonly label: string; // short button label in the conversation language, with a leading emoji
  readonly instruction: string; // precise imperative for the agent, with absolute date and time
};

export type SecretaryAction = {
  readonly _id?: ObjectId;
  readonly shortId: string; // carried in callback_data
  readonly ownerChatId: number;
  readonly type: SecretaryActionType;
  readonly label: string;
  readonly instruction: string;
  readonly status: SecretaryActionStatus;
  readonly messageId?: number; // the summary message the button lives on
  readonly result?: string;
  readonly createdAt: Date;
  readonly executedAt?: Date;
};

export type CreateSecretaryActionData = SecretarySummaryAction & {
  readonly shortId: string;
  readonly ownerChatId: number;
};
