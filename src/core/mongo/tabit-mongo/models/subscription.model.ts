import { ITabitRestaurant, IUserSelections } from '@services/tabit';
import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  userSelections: IUserSelections;
  restaurantDetails: ITabitRestaurant;
  isActive: boolean;
  createdAt: Date;
}
