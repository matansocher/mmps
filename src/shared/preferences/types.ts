import type { ObjectId } from 'mongodb';

export type Preference = {
  readonly _id?: ObjectId;
  readonly key: string;
  readonly value: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreatePreferenceData = {
  readonly key: string;
  readonly value: string;
};

export type UpdatePreferenceData = {
  readonly value: string;
  readonly updatedAt: Date;
};
