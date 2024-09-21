import type { ObjectId } from 'mongodb';
import { IOntopoRestaurant, IUserSelections } from '@services/ontopo/interface';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  userSelections: IUserSelections;
  restaurantDetails: IOntopoRestaurant;
  isActive: boolean;
  createdAt: Date;
}
