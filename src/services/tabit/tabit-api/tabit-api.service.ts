import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { ITabitRestaurant, ITabitRestaurantArea, IUserFlowDetails } from '@services/tabit/interface';
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

  async getRestaurantDetails(restaurantUrl: string): Promise<ITabitRestaurant> {
    try {
      const restaurantId = this.getRestaurantId(restaurantUrl);
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
    // $$$$$$$$$$$$$$$$$$$$$ need to get opening hours and possible num of seats to show the options
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

  getRestaurantOpeningHours(result): any {
  // getRestaurantOpeningHours(result): ITabitRestaurantOpeningHours[] {
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

    return openingHours;
  }

  async getRestaurantAvailability(checkAvailabilityOptions: IUserFlowDetails): Promise<any> {
    try {
      const { restaurantDetails, date, time, numOfSeats, area } = checkAvailabilityOptions;
      const url = `${RESTAURANT_CHECK_AVAILABILITY_URL}`;
      const reservedFrom = date + time;
      const reqBody = {
        ...RESTAURANT_CHECK_AVAILABILITY_BASE_BODY,
        organization: restaurantDetails.id,
        seats_count: numOfSeats,
        preference: area,
        reserved_from: reservedFrom, // '2024-09-02T1:0:00.000Z'
      };
      const result = await axios.post(url, reqBody);
      return this.parseRestaurantAvailabilityResult(restaurantDetails, result.data);
    } catch (err) {
      this.logger.error(this.getRestaurantDetails.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantAvailabilityResult(restaurantDetails: ITabitRestaurant, result): ITabitRestaurant {
    // $$$$$$$$$$$$$$$$$$$$$ if the restaurant is available the result will have a key - 'reservation'
    // $$$$$$$$$$$$$$$$$$$$$ if the restaurant is not available the result will have a key - 'alternative_results'
    // $$$$$$$$$$$$$$$$$$$$$ so if you have the key 'reservation' or 'alternative_results' with the right selections (checkAvailabilityOptions)

    // reservation
    const objWithReservation = {
      "reservation": {
        "online_booking_source_client": {
          "name": "tabit-web",
            "version": null,
            "environment": "il-prod"
        },
        "reservation_details": {
          "reserved_tables_ids": [
            "5de8c99be3a58b8fdd20c4e4"
          ],
          "reserved_tables_locked": false,
          "reserved_until_is_estimated": true,
          "preference": "outside",
          "preferences": [
            "outside"
          ],
          "tags": [{ "value": "reservation_tags_temp" }],
          "notify_almost_done": false,
          "seats_count": 2,
          "reserved_from": "2024-09-02T14:00:00.000Z",
          "reserved_until": "2024-09-02T16:00:00.000Z",
          "additional_customers": []
        },
        "state": "created",
        "organization": "5dd5306729d41d77e03894ff",
        "last_modified": null,
        "last_modified_by": null,
        "last_modified_by_name": null,
        "last_modified_by_organization": null,
        "online_booking": true,
        "temp_reservation": true,
        "standby_reservation": false,
        "pending_approval": false,
        "block_review": false,
        "exclude_from_remind_all": false,
        "deposit_removed": false,
        "order_life_cycle_log": [],
        "order_fired": null,
        "hotel_guests_ids": [],
        "_id": "66cf50ed6314453d7ff2e435",
        "type": "future_reservation",
        "online_booking_source": "tabit",
        "temp_reservation_expires": "2024-08-28T16:36:41.767Z",
        "created_by": "online_booking",
        "created_by_client": {
          "ip": "94.188.131.109",
            "device_name": null,
            "useragent": {
            "os": "iOS",
              "platform": "unknown",
              "browser": "axios",
              "version": "1.7.2",
              "isMobile": true,
              "isDesktop": false,
              "isBot": false
          }
        },
        "created": "2024-08-28T16:31:41.803Z"
      }
    }

    const objWithAlternativeResults = {
      "description_string": "booking.search.results_info",
      "alternative_results": [
        {
          "requested_day_result": true,
          "title_timestamp": "2024-08-29T17:00:00.000Z",
          "time_slots_by_area": true,
          "time_slots": [
            {
              "name": "outside",
              "time_slots": [
                "2024-08-29T18:45:00.000Z",
                "2024-08-29T15:45:00.000Z",
                "2024-08-29T19:00:00.000Z",
                "2024-08-29T15:15:00.000Z",
                "2024-08-29T19:15:00.000Z",
                "2024-08-29T15:00:00.000Z"
              ]
            },
            {
              "name": "inside",
              "time_slots": [
                "2024-08-29T19:30:00.000Z",
                "2024-08-29T15:00:00.000Z",
                "2024-08-29T14:45:00.000Z",
                "2024-08-29T14:30:00.000Z"
              ]
            },
            {
              "name": "bar_corona",
              "time_slots": [
                "2024-08-29T15:00:00.000Z",
                "2024-08-29T14:45:00.000Z",
                "2024-08-29T14:30:00.000Z"
              ]
            }
          ]
        }
      ],
      "standby_reservation_allowed": true
    }
    return restaurantDetails;
  }
}
