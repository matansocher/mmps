import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import {
  ITabitRestaurant,
  ITabitRestaurantArea,
  ITabitRestaurantAvailability,
  ITabitRestaurantReservationHour,
  ITabitRestaurantReservationHours,
  IUserSelections,
} from '../interface';
import { ANY_AREA, RESTAURANT_CHECK_AVAILABILITY_BASE_BODY, RESTAURANT_CHECK_AVAILABILITY_URL, RESTAURANT_DETAILS_BASE_URL } from '../tabit.config';

@Injectable()
export class TabitApiService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  getRestaurantId(restaurantUrl: string): string {
    const queryParams = new URLSearchParams(restaurantUrl);
    return queryParams.get('orgId');
  }

  async getRestaurantDetails(restaurantId: string): Promise<ITabitRestaurant> {
    try {
      if (!restaurantId) {
        return null;
      }
      const restaurantDetails = await axios.get(`${RESTAURANT_DETAILS_BASE_URL}/${restaurantId}`);
      return this.parseRestaurantResult(restaurantId, restaurantDetails.data);
    } catch (err) {
      this.logger.error(this.getRestaurantDetails.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantResult(restaurantId: string, restaurantDetails): ITabitRestaurant {
    const strings = restaurantDetails.strings.rsv['en-US'];
    const areas = this.getRestaurantAreas(restaurantDetails, strings);
    const openingHours = this.getRestaurantOpeningHours(restaurantDetails);
    const noReservationsMinutesFromEndOfDay = this.getNoReservationsMinutesFromEndOfDay(restaurantDetails);
    const reservationHours = this.getRestaurantReservationHours(openingHours, noReservationsMinutesFromEndOfDay);
    const { title, phone, address, image } = restaurantDetails.organization['en-US'];
    return {
      id: restaurantId,
      title,
      phone,
      address,
      image,
      isOnlineBookingAvailable: !!restaurantDetails.online_booking?.enabled,
      areas,
      reservationHours,
    };
  }

  getRestaurantAreas(result, strings): ITabitRestaurantArea[] {
    return result.map.areas
      .map((area) => ({ name: area[0], includeInRsv: area[1].include_in?.rsv }))
      .filter((area) => area.includeInRsv)
      .map((area) => {
        const displayName = strings.booking.search[area.name];
        return { name: area.name, displayName };
      });
  }

  getRestaurantOpeningHours(result): ITabitRestaurantReservationHours {
    const openingHours: ITabitRestaurantReservationHours = { default: [] };

    result.shifts?.forEach(([day, shifts]) => {
      openingHours[day] = shifts.reduce((acc, [, shiftDetails]) => {
        const lastShift = acc[acc.length - 1];
        const lastShiftTo = lastShift ? new Date(`1970-01-01T${lastShift.to}:00Z`).getTime() : null;
        const currentShiftFrom = new Date(`1970-01-01T${shiftDetails.from}:00Z`).getTime();

        if (lastShift && (currentShiftFrom - lastShiftTo) / 60000 <= 1) {
          lastShift.to = shiftDetails.to;
        } else {
          acc.push({ from: shiftDetails.from, to: shiftDetails.to });
        }

        return acc;
      }, []);
    });

    return openingHours;
  }

  getRestaurantReservationHours(openingHours: ITabitRestaurantReservationHours, noReservationsMinutesFromEndOfDay: number): ITabitRestaurantReservationHours {
    const adjustTime = (time: string): string => {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date(1970, 0, 1, hours, minutes);

      date.setMinutes(date.getMinutes() - noReservationsMinutesFromEndOfDay);

      if (date.getMinutes() === 59) {
        date.setMinutes(0);
        date.setHours(date.getHours() + 1);
      }

      date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5); // Round minutes to the nearest multiple of 5 (22:29 becomes 22:30)

      // return date.toISOString().slice(11, 16);
      return `${date.getHours()}:${date.getMinutes()}`;
    };

    Object.keys(openingHours).forEach((day: string) => {
      openingHours[day] = openingHours[day].map((shift: ITabitRestaurantReservationHour) => ({ ...shift, to: adjustTime(shift.to) }));
    });

    return openingHours;
  }

  getNoReservationsMinutesFromEndOfDay(result): number {
    const { date_time_until_format } = result;
    const { minutes = 0, min_group_size = 0 } = date_time_until_format?.reduction?.[0];
    return minutes * min_group_size;
  }

  restaurantAvailabilityApiRequest(restaurantId: string, userSelections: Partial<IUserSelections>) {
    const { date, time, size, area } = userSelections;
    const reservedFrom = this.utilsService.getTimeWithOffset(date, time) || time;

    const reqBody = {
      ...RESTAURANT_CHECK_AVAILABILITY_BASE_BODY,
      organization: restaurantId,
      seats_count: size,
      preference: area,
      reserved_from: reservedFrom,
    };
    return axios.post(RESTAURANT_CHECK_AVAILABILITY_URL, reqBody);
  }

  async getRestaurantAvailability(restaurantDetails: ITabitRestaurant, checkAvailabilityOptions: IUserSelections): Promise<ITabitRestaurantAvailability> {
    try {
      if (checkAvailabilityOptions.area && checkAvailabilityOptions.area !== ANY_AREA) {
        const result = await this.restaurantAvailabilityApiRequest(restaurantDetails.id, checkAvailabilityOptions);
        return this.parseRestaurantAvailabilityResult(result.data, checkAvailabilityOptions);
      }

      if (checkAvailabilityOptions.area === ANY_AREA) {
        const areasResults = await Promise.all(
          restaurantDetails.areas.map((area) => this.restaurantAvailabilityApiRequest(restaurantDetails.id, { ...checkAvailabilityOptions, area: area.name }))
        );

        const availableArea = areasResults
          .map((areaResult) => this.parseRestaurantAvailabilityResult(areaResult.data, checkAvailabilityOptions))
          .find((areaResult) => areaResult.isAvailable);

        if (!availableArea) {
          return { isAvailable: false };
        }

        return { isAvailable: availableArea.isAvailable, reservationDetails: availableArea.reservationDetails };
      }

      return { isAvailable: false };
    } catch (err) {
      this.logger.error(this.getRestaurantAvailability.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantAvailabilityResult(result, checkAvailabilityOptions: IUserSelections): ITabitRestaurantAvailability {
    const isAvailable = result?.reservation?.state === 'created';
    if (!isAvailable) {
      return { isAvailable };
    }
    const reservedArea = result.reservation.reservation_details?.preference;
    const reservationDetails = { date: checkAvailabilityOptions.date, time: checkAvailabilityOptions.time, size: checkAvailabilityOptions.size, area: reservedArea };
    return { isAvailable, reservationDetails }; // test to see if result.area
  }
}
