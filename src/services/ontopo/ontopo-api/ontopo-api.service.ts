import { IOntopoRestaurant, IUserSelections } from '@services/ontopo/interface';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { RESTAURANT_CHECK_AVAILABILITY_BASE_HEADERS, RESTAURANT_CHECK_AVAILABILITY_URL } from '@services/ontopo/ontopo.config';

@Injectable()
export class OntopoApiService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async init() {
    // const restaurantDetails = await this.getRestaurantDetails('https://ontopo.co.il/ocd'); // ocd
    const restaurantDetails = await this.getRestaurantDetails('https://ontopo.com/he/il/page/45869402'); // kazan
    const userSelections = {
      size: 2,
      date: new Date(),
      time: '1800',
      // area: 'inside',
    };
    // const restaurantAvailability = await this.getRestaurantAvailability('88542392', userSelections); // ocd
    // const restaurantAvailability = await this.getRestaurantAvailability('26700368', userSelections); // brener
    const restaurantAvailability = await this.getRestaurantAvailability('45869402', userSelections); // kazan
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
      areas: [], // $$$$$$$$$$$$$$$$$$$$ - not asking on the first step pf order
      reservationHours: {}, // $$$$$$$$$$$$$$$$$$$$
      // maxMonthsAhead: +restaurantConfiguration.date_picker_end_month_count,
      maxMonthsAhead: 0, // $$$$$$$$$$$$$$$$$$$$
      // maxSize: +restaurantConfiguration.max_group_size,
      maxSize: 0, // $$$$$$$$$$$$$$$$$$$$
    };
  }

  async getRestaurantAvailability(restaurantSlug: string, userSelections: IUserSelections) {
    const body = {
      slug: restaurantSlug,
      locale: 'en',
      criteria: {
        size: userSelections.size,
        date: `${userSelections.date.getFullYear()}${userSelections.date.getMonth() + 1}${userSelections.date.getDay()}`,
        time: userSelections.time,
      },
    };
    const response = await axios.post(RESTAURANT_CHECK_AVAILABILITY_URL, body, { headers: RESTAURANT_CHECK_AVAILABILITY_BASE_HEADERS });
    return response.data;
  }
}
