import type { ObjectId } from 'mongodb';

export type ChilliPrompt = {
  readonly _id?: ObjectId;
  readonly text: string;
  readonly createdAt: Date;
};
