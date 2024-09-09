export interface ITabitRestaurantArea {
  name: string;
  displayName: string;
}

export interface ITabitRestaurantOpeningHour {
  from: string;
  to: string;
}

export interface ITabitRestaurantOpeningHours {
  default: ITabitRestaurantOpeningHour[];
  sun?: ITabitRestaurantOpeningHour[];
  mon?: ITabitRestaurantOpeningHour[];
  tue?: ITabitRestaurantOpeningHour[];
  wed?: ITabitRestaurantOpeningHour[];
  thu?: ITabitRestaurantOpeningHour[];
  fri?: ITabitRestaurantOpeningHour[];
  sat?: ITabitRestaurantOpeningHour[];
}

export interface ITabitRestaurant {
  id: string;
  title: string;
  phone: string;
  address: string;
  image: string;
  isOnlineBookingAvailable: boolean;
  timezone: string;
  areas: ITabitRestaurantArea[];
  openingHours: ITabitRestaurantOpeningHours;
  maxMonthsAhead: number;
  maxNumOfSeats: number;
}
