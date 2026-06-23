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

export type SecretaryDraftStatus = 'pending' | 'sent' | 'cancelled' | 'superseded';

// A smart reply draft suggested to the owner after the other side went unanswered for a while.
export type SecretaryDraft = {
  readonly _id?: ObjectId;
  readonly shortId: string; // carried in callback_data
  readonly chatId: number; // the other person's chat (where the reply would be sent)
  readonly ownerChatId: number; // where the suggestion DM is delivered (the owner)
  readonly businessConnectionId?: string; // connection used to send as the owner
  readonly draftText: string;
  readonly summaryText?: string;
  readonly status: SecretaryDraftStatus;
  readonly messageId?: number; // the suggestion message the buttons live on
  readonly createdAt: Date;
  readonly sentAt?: Date;
};

export type CreateSecretaryDraftData = {
  readonly shortId: string;
  readonly chatId: number;
  readonly ownerChatId: number;
  readonly businessConnectionId?: string;
  readonly draftText: string;
  readonly summaryText?: string;
};
