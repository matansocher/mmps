export interface IOntopoRestaurantAvailability {
  isAvailable: boolean;
  alternativeResults?: any[]; // TODO: deal with alternative results to show the user close suggestions
}