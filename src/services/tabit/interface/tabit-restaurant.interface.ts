export interface ITabitRestaurantArea {
  name: string;
  displayName: string;
}

export interface ITabitRestaurantReservationHour {
  from: string;
  to: string;
}

export interface ITabitRestaurantReservationHours {
  default: ITabitRestaurantReservationHour[];
  sun?: ITabitRestaurantReservationHour[];
  mon?: ITabitRestaurantReservationHour[];
  tue?: ITabitRestaurantReservationHour[];
  wed?: ITabitRestaurantReservationHour[];
  thu?: ITabitRestaurantReservationHour[];
  fri?: ITabitRestaurantReservationHour[];
  sat?: ITabitRestaurantReservationHour[];
}

export interface ITabitRestaurant {
  id: string;
  title: string;
  phone: string;
  address: string;
  image: string;
  isOnlineBookingAvailable: boolean;
  areas: ITabitRestaurantArea[];
  reservationHours: ITabitRestaurantReservationHours;
}
