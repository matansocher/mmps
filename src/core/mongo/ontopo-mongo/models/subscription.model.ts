import { IOntopoRestaurant, IUserSelections } from '@services/ontopo';
import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  userSelections: IUserSelections;
  restaurantDetails: IOntopoRestaurant;
  isActive: boolean;
  createdAt: Date;
}
