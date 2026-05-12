import type { ObjectId } from 'mongodb';

export type Friend = {
  readonly _id?: ObjectId;
  readonly name: string;
  readonly createdAt: Date;
};

export type CreateFriendData = {
  readonly name: string;
};
