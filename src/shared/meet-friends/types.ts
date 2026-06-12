import type { ObjectId } from 'mongodb';

export type MeetFriend = {
  readonly _id?: ObjectId;
  readonly name: string;
  readonly createdAt: Date;
};

export type CreateMeetFriendData = {
  readonly name: string;
};
