import { IUserSelections } from './user-flow-details.interface';

export interface ITabitRestaurantAvailability {
  isAvailable: boolean;
  reservationDetails?: Partial<IUserSelections>;
  alternativeResults?: any[]; // TODO: deal with alternative results to show the user close suggestions
}
