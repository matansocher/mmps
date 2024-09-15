import { IOntopoRestaurant, IUserSelections } from '@services/ontopo/interface';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import {
  RESTAURANT_CHECK_AVAILABILITY_BASE_HEADERS,
  RESTAURANT_CHECK_AVAILABILITY_URL
} from '@services/ontopo/ontopo.config';

@Injectable()
export class OntopoApiService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async init() {
    const restaurantDetails = await this.getRestaurantDetails('https://ontopo.co.il/ocd');
    const userSelections = {
      numOfSeats: 2,
      date: new Date(),
      time: '2100',
      // area: 'inside',
    };
    const restaurantAvailability = await this.getRestaurantAvailability('88542392', userSelections);
    return { restaurantDetails, restaurantAvailability };
  }

  async getRestaurantDetails(restaurantUrl: string): Promise<IOntopoRestaurant> {
    const response = await axios.get(restaurantUrl, { headers: RESTAURANT_CHECK_AVAILABILITY_BASE_HEADERS });

    const dom = new JSDOM(response.data, { runScripts: 'dangerously' });

    // Access the window object
    const restaurantDetailsRes = dom.window['__INITIAL_STATE__'];

    const restaurantDetails = this.parseRestaurantResult(restaurantDetailsRes);
    return restaurantDetails;
  }

  parseRestaurantResult(restaurantDetailsRes): IOntopoRestaurant {
    // const strings = restaurantDetailsRes.strings.rsv['en-US'];
    // const areas = this.getRestaurantAreas(restaurantDetailsRes, strings);
    // const openingHours = this.getRestaurantOpeningHours(restaurantDetailsRes);
    // const noReservationsMinutesFromEndOfDay = this.getNoReservationsMinutesFromEndOfDay(restaurantDetailsRes);
    // const reservationHours = this.getRestaurantReservationHours(openingHours, noReservationsMinutesFromEndOfDay);
    const { slug, title, phone, address, cover } = restaurantDetailsRes?.page?.content;
    return {
      slug,
      title,
      phone,
      address,
      image: cover,
      isOnlineBookingAvailable: true, // $$$$$$$$$$$$$$$$$$$$
      areas: [], // $$$$$$$$$$$$$$$$$$$$
      reservationHours: {}, // $$$$$$$$$$$$$$$$$$$$
      // maxMonthsAhead: +restaurantConfiguration.date_picker_end_month_count,
      maxMonthsAhead: 0, // $$$$$$$$$$$$$$$$$$$$
      // maxNumOfSeats: +restaurantConfiguration.max_group_size,
      maxNumOfSeats: 0, // $$$$$$$$$$$$$$$$$$$$
    };
  }

  async getRestaurantAvailability(restaurantSlug: string, userSelections: IUserSelections) {
    const body = {
      slug: restaurantSlug,
      locale: 'en',
      criteria: {
        size: userSelections.numOfSeats,
        date: `${userSelections.date.getFullYear()}${userSelections.date.getMonth() + 1}${userSelections.date.getDay()}`,
        time: userSelections.time,
      },
    };
    const response = await axios.post(RESTAURANT_CHECK_AVAILABILITY_URL, body, { headers: RESTAURANT_CHECK_AVAILABILITY_BASE_HEADERS });
    return response.data;
  }
}
