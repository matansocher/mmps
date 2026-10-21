import type { ObjectId } from 'mongodb';

export type Memory = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly content: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateMemoryData = Pick<Memory, 'chatId' | 'content'>;
