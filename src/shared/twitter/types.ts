import { ObjectId } from 'mongodb';

export type TwitterSubscription = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly twitterUserId: string;
  readonly username: string;
  readonly name: string;
  readonly description?: string;
  readonly profileImageUrl?: string;
  readonly verified: boolean;
  readonly followersCount: number;
  readonly followingCount: number;
  readonly tweetCount: number;
  readonly subscribedAt: Date;
  readonly lastFetchedAt?: Date;
};
