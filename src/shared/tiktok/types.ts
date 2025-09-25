import type { ObjectId } from 'mongodb';

export type Video = {
  readonly _id: ObjectId;
  readonly videoId: string;
  readonly createdAt: Date;
};

export type Channel = {
  readonly _id: ObjectId;
  readonly username: string;
  readonly lang?: string;
  readonly createdAt: Date;
};
