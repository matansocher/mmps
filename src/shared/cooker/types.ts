import type { ObjectId } from 'mongodb';

export type Recipe = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly title: string;
  readonly ingredients: string[];
  readonly instructions: string;
  readonly tags?: string[];
  readonly emoji?: string;
  readonly link?: string;
  readonly updatedAt: Date;
  readonly createdAt: Date;
};
