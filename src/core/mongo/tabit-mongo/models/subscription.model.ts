import type { ObjectId } from 'mongodb';
import { ITabitRestaurant, IUserSelections } from '@services/tabit';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  userSelections: IUserSelections;
  restaurantDetails: ITabitRestaurant;
  isActive: boolean;
  createdAt: Date;
}
