import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import {
  ITabitRestaurant,
  ITabitRestaurantArea,
  ITabitRestaurantAvailability,
  ITabitRestaurantReservationHour,
  ITabitRestaurantReservationHours,
  IUserSelections,
} from '@services/tabit/interface';
import {
  RESTAURANT_CHECK_AVAILABILITY_BASE_BODY,
  RESTAURANT_CHECK_AVAILABILITY_URL,
  RESTAURANT_CONFIGURATION_BASE_URL,
  RESTAURANT_DETAILS_BASE_URL,
  TIME_GAP_FROM_USER_SELECTION_IN_MINUTES,
} from '../tabit.config';

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
      const restaurantDetailsUrl = `${RESTAURANT_DETAILS_BASE_URL}/${restaurantId}`;
      const restaurantConfigurationUrl = `${RESTAURANT_CONFIGURATION_BASE_URL}?organization=${restaurantId}`;
      const [restaurantDetails, restaurantConfiguration] = await Promise.all([
        axios.get(restaurantDetailsUrl),
        axios.get(restaurantConfigurationUrl),
      ]);
      return this.parseRestaurantResult(restaurantId, restaurantDetails.data, restaurantConfiguration.data);
    } catch (err) {
      this.logger.error(this.getRestaurantDetails.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantResult(restaurantId: string, restaurantDetails, restaurantConfiguration): ITabitRestaurant {
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
      openingHours[day] = shifts.reduce((acc, [_, shiftDetails]) => {
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

  async getRestaurantAvailability(restaurantDetails: ITabitRestaurant, checkAvailabilityOptions: IUserSelections): Promise<ITabitRestaurantAvailability> {
    try {
      const { date, time, size, area } = checkAvailabilityOptions;
      const url = `${RESTAURANT_CHECK_AVAILABILITY_URL}`;

      const reservedFrom = this.utilsService.getTimeWithOffset(date, time) || time;

      const reqBody = {
        ...RESTAURANT_CHECK_AVAILABILITY_BASE_BODY,
        organization: restaurantDetails.id,
        seats_count: size,
        preference: area,
        reserved_from: reservedFrom,
      };
      const result = await axios.post(url, reqBody);
      return this.parseRestaurantAvailabilityResult(result.data, checkAvailabilityOptions);
    } catch (err) {
      this.logger.error(this.getRestaurantAvailability.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantAvailabilityResult(result, checkAvailabilityOptions: IUserSelections): ITabitRestaurantAvailability {
    const notAvailableResponse = { isAvailable: false };
    if (result?.reservation?.state === 'created') {
      return { isAvailable: true };
    }

    // if the restaurant is not available but has other options suggested
    if (result?.alternative_results?.length) {
      const alternativeResults = this.getAlternativeResults(result?.alternative_results, checkAvailabilityOptions);
      return { isAvailable: false, alternativeResults };
    }
    return notAvailableResponse;
  }

  getAlternativeResults = (alternativeResults, checkAvailabilityOptions: IUserSelections): string[] => {
    const { time_slots: restaurantTimeSlots = [] } = alternativeResults[0];
    const relevantTimeSlotsByArea = restaurantTimeSlots.find((area) => area.name.toLowerCase() === checkAvailabilityOptions.area.toLowerCase());
    if (!relevantTimeSlotsByArea) {
      return null;
    }
    const { time_slots: areaTimeSlots = [] } = relevantTimeSlotsByArea;
    const [hour, minute] = checkAvailabilityOptions.time.split(':');
    const userDateAndTimeRequested = new Date(checkAvailabilityOptions.date);
    userDateAndTimeRequested.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // https://chatgpt.com/c/66da05d7-3540-8001-884f-4e1149b6e599

    for (const timeSlot of areaTimeSlots) { // available times are coming back in utc (restaurant local time)
      // const areaTimeSlotsExample = ['2024-09-13T15:15:00.000Z', '2024-09-13T14:45:00.000Z', '2024-09-13T15:30:00.000Z', '2024-09-13T14:30:00.000Z', '2024-09-13T15:45:00.000Z', '2024-09-13T14:15:00.000Z'];
      // // move the user time slot to utc and compare with the available time slots
      // const userTimeSlot = new Date(userDateAndTimeRequested).toISOString();
      // // if the user time slot is less than a const (TIME_GAP_FROM_USER_SELECTION_IN_MINUTES) the available time slot, return the available time slot
      // if (userTimeSlot < timeSlot && new Date(timeSlot) - new Date(userTimeSlot) <= TIME_GAP_FROM_USER_SELECTION_IN_MINUTES * 60 * 1000) {
      //   const alternativeResults = areaTimeSlotsExample
      //     .filter((time) => new Date(time) > new Date())
      //     .sort((a, b) => new Date(a) - new Date(b));
      //   return { isAvailable: false, alternativeResults };
    }
  }
}
