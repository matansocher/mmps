export interface IOntopoRestaurantArea {
  name: string;
  displayName: string;
}

export interface IOntopoRestaurantReservationHour {
  from: string;
  to: string;
}

export interface IOntopoRestaurantReservationHours {
  default: IOntopoRestaurantReservationHour[];
  sun?: IOntopoRestaurantReservationHour[];
  mon?: IOntopoRestaurantReservationHour[];
  tue?: IOntopoRestaurantReservationHour[];
  wed?: IOntopoRestaurantReservationHour[];
  thu?: IOntopoRestaurantReservationHour[];
  fri?: IOntopoRestaurantReservationHour[];
  sat?: IOntopoRestaurantReservationHour[];
}

export interface IOntopoRestaurant {
  slug: string;
  title: string;
  phone: string;
  address: string;
  image: string;
  isOnlineBookingAvailable: boolean;
  areas: IOntopoRestaurantArea[];
  // reservationHours: IOntopoRestaurantReservationHours;
  reservationHours: any;
  maxMonthsAhead: number;
  maxNumOfSeats: number;
}
