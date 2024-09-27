import { IUserSelections } from '@services/tabit/interface';

export interface ITabitRestaurantAvailability {
  isAvailable: boolean;
  reservationDetails?: Partial<IUserSelections>;
  alternativeResults?: any[]; // TODO: deal with alternative results to show the user close suggestions
}
