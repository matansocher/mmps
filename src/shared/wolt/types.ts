import type { ObjectId } from 'mongodb';

export type WoltRestaurant = {
  readonly id: string;
  readonly name: string;
  readonly isOnline: string;
  readonly slug: string;
  readonly area: string;
  readonly photo: string;
  readonly link: string;
};

export type RestaurantsList = {
  readonly restaurants: WoltRestaurant[];
  readonly lastUpdated: number;
};

export type Subscription = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly restaurant: string;
  readonly restaurantPhoto: string;
  readonly isActive: boolean;
  readonly isSuccess: boolean;
  readonly finishedAt: Date;
  readonly createdAt: Date;
};
