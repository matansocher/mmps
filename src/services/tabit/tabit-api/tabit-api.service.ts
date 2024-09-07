import { ITabitRestaurantOpeningHours } from '@services/tabit/interface/tabit-restaurant.interface';
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import {
  ITabitRestaurant,
  ITabitRestaurantArea,
  ITabitRestaurantAvailability,
  IUserSelections
} from '@services/tabit/interface';
import {
  RESTAURANT_CHECK_AVAILABILITY_BASE_BODY,
  RESTAURANT_CHECK_AVAILABILITY_URL,
  RESTAURANT_CONFIGURATION_BASE_URL,
  RESTAURANT_DETAILS_BASE_URL,
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
      ])
      return this.parseRestaurantResult(restaurantId, restaurantDetails.data, restaurantConfiguration.data);
    } catch (err) {
      this.logger.error(this.getRestaurantDetails.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantResult(restaurantId: string, restaurantDetails, restaurantConfiguration): ITabitRestaurant {
    const strings = restaurantDetails.strings.rsv['he-IL'];
    const areas = this.getRestaurantAreas(restaurantDetails, strings);
    const openingHours = this.getRestaurantOpeningHours(restaurantDetails);
    const { title, phone, address, image } = restaurantDetails.organization['he-IL'];
    return {
      id: restaurantId,
      title,
      phone,
      address,
      image,
      isOnlineBookingAvailable: !!restaurantDetails.online_booking?.enabled,
      timezone: restaurantDetails.timezone,
      areas,
      // openingHours,
      maxMonthsAhead: +restaurantConfiguration.date_picker_end_month_count,
      maxNumOfSeats: +restaurantConfiguration.max_group_size,
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

  // getRestaurantOpeningHours(result): any {
  getRestaurantOpeningHours(result): ITabitRestaurantOpeningHours[] {
    const openingHours: Record<string, { from: string; to: string }[]> = {};

    result.shifts.forEach(([day, shifts]) => {
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

    // return openingHours;
    return null;
  }

  async getRestaurantAvailability(restaurantId: string, checkAvailabilityOptions: IUserSelections): Promise<any> {
    try {
      const { date, time, numOfSeats, area } = checkAvailabilityOptions;
      const url = `${RESTAURANT_CHECK_AVAILABILITY_URL}`;

      const reservedFrom = new Date(`${date}T${time}:00.000Z`).toISOString();

      const reqBody = {
        ...RESTAURANT_CHECK_AVAILABILITY_BASE_BODY,
        organization: restaurantId,
        seats_count: numOfSeats,
        preference: area,
        reserved_from: reservedFrom, // '2024-09-02T1:0:00.000Z'
      };
      const result = await axios.post(url, reqBody);
      return this.parseRestaurantAvailabilityResult(result.data, checkAvailabilityOptions);
    } catch (err) {
      this.logger.error(this.getRestaurantAvailability.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantAvailabilityResult(result, checkAvailabilityOptions: IUserSelections): ITabitRestaurantAvailability {
    const notAvailableResponse = { isAvailable: false, availableUntil: null };
    if (result?.reservation?.state === 'created') {
      const { temp_reservation_expires } = result.reservation;
      const isAvailable = true;
      const availableUntil = new Date(temp_reservation_expires);
      return { isAvailable, availableUntil };
    }

    // if the restaurant is not available but has other options suggested
    if (result?.alternative_results?.length) {
      const { time_slots: restaurantTimeSlots = [] } = result.alternative_results[0];
      const relevantTimeSlotsByArea = restaurantTimeSlots.find((area) => area.name.toLowerCase() === checkAvailabilityOptions.area.toLowerCase());
      if (!relevantTimeSlotsByArea) {
        return notAvailableResponse;
      }
      const { time_slots: areaTimeSlots = [] } = restaurantTimeSlots;
      for (const timeSlot of areaTimeSlots) {
        const userDateAndTimeRequested = new Date(`${checkAvailabilityOptions.date}T${checkAvailabilityOptions.time}:00.000Z`);
        if (new Date(timeSlot) > userDateAndTimeRequested) {
          const availableUntil = new Date(timeSlot);
          return { isAvailable: true, availableUntil };
        }
      }
    }
    return notAvailableResponse;
  }
}

const objWithReservation = {
  reservation: {
    reservation_details: {
      preference: 'outside',
      seats_count: 3,
      reserved_from: '2024-09-09T17:00:00.000Z',
      reserved_until: '2024-09-09T19:00:00.000Z',
    },
    state: 'created',
    organization: '5dd5306729d41d77e03894ff',
    temp_reservation: true,
    standby_reservation: false,
    pending_approval: false,
    temp_reservation_expires: '2024-09-06T22:34:57.919Z',
    created_by: 'online_booking',
    created: '2024-09-06T22:29:57.954Z',
  },
};

const objWithAlternativeResults = {
  alternative_results: [
    {
      requested_day_result: true,
      title_timestamp: '2024-08-29T17:00:00.000Z',
      time_slots_by_area: true,
      time_slots: [
        {
          name: 'outside',
          time_slots: ['2024-08-29T18:45:00.000Z', '2024-08-29T15:45:00.000Z', '2024-08-29T19:00:00.000Z', '2024-08-29T15:15:00.000Z'],
        },
        {
          name: 'inside',
          time_slots: ['2024-08-29T19:30:00.000Z', '2024-08-29T15:00:00.000Z', '2024-08-29T14:45:00.000Z', '2024-08-29T14:30:00.000Z'],
        },
        {
          name: 'bar_corona',
          time_slots: ['2024-08-29T15:00:00.000Z', '2024-08-29T14:45:00.000Z', '2024-08-29T14:30:00.000Z'],
        },
      ],
    },
  ],
};
