import type { ObjectId } from 'mongodb';

// A PlayStation Store game the user is watching for price drops.
export type GamePriceWatch = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly conceptId: string; // PlayStation Store concept id — stable across storefronts
  readonly productId?: string; // the exact edition to re-check, when the watch was added from a product link
  readonly name: string;
  readonly url: string;
  readonly coverUrl: string | null;
  readonly currency: string;
  readonly basePrice: number; // minor units, full price for context in the alert
  readonly lowestPrice: number; // minor units, lowest price seen so far, the drop baseline
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateGamePriceWatchData = Omit<GamePriceWatch, '_id' | 'isActive' | 'createdAt' | 'updatedAt'>;
