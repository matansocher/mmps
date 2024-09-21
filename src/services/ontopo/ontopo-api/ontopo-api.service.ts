import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IOntopoRestaurant, IOntopoRestaurantArea, IOntopoRestaurantAvailability, IUserSelections } from '@services/ontopo/interface';
import { RESTAURANT_CHECK_AVAILABILITY_URL, RESTAURANT_FOR_USER_BASE_URL } from '@services/ontopo/ontopo.config';
import { OntopoApiUtils } from './ontopo-api.utils';

@Injectable()
export class OntopoApiService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly ontopoApiUtils: OntopoApiUtils,
  ) {
    this.init(); // $$$$$$$$$$$$$$$$
  }

  async init() {
    const restaurantDetails = await this.getRestaurantDetails(`45869402`); // kazan
    const userSelections = { size: 2, date: this.ontopoApiUtils.getNextMondayDate(), time: '18:00', area: 'Inside' };
    const { isAvailable } = await this.isRestaurantAvailable(restaurantDetails.slug, userSelections);
    return { restaurantDetails, isAvailable };
  }

  async getRestaurantDetails(restaurantSlug: string): Promise<IOntopoRestaurant> {
    try {
      const [restaurantDetailsRes, restaurantAreasRes] = await Promise.all([
        axios.get(`${RESTAURANT_FOR_USER_BASE_URL}/${restaurantSlug}`),
        this.getRestaurantAreas(restaurantSlug),
      ]);
      const dom = new JSDOM(restaurantDetailsRes.data, { runScripts: 'dangerously' });
      const restaurantDetails = dom.window['__INITIAL_STATE__'];
      return this.parseRestaurantResult(restaurantDetails, restaurantAreasRes);
    } catch (err) {
      this.logger.error(this.getRestaurantDetails.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  async getRestaurantAreas(restaurantSlug): Promise<IOntopoRestaurantArea[]> {
    try {
      const generalUserSelections = { size: 2, date: this.ontopoApiUtils.getNextMondayDate(), time: '20:00' };
      const restaurantAreasRes = await this.getRestaurantAvailability(restaurantSlug, generalUserSelections);
      const { areas } = restaurantAreasRes || {};
      return areas.map((area) => ({
        name: area.id,
        displayName: area.name,
      }));
    } catch (err) {
      this.logger.error(this.getRestaurantAreas.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  parseRestaurantResult(restaurantDetailsRes, areas): IOntopoRestaurant {
    const { slug, title, phone, address, cover, shifts } = restaurantDetailsRes?.websiteContentStore?.pageData || {};
    const reservationHours = this.ontopoApiUtils.getRestaurantReservationHours(shifts);
    return {
      slug,
      title,
      phone,
      address,
      image: cover,
      isOnlineBookingAvailable: true,
      areas,
      reservationHours,
    };
  }

  async getRestaurantAvailability(restaurantSlug: string, userSelections: IUserSelections) {
    try {
      const body = {
        slug: restaurantSlug,
        locale: 'en',
        criteria: {
          size: userSelections.size.toString(),
          date: `${this.utilsService.getDateNumber(userSelections.date.getFullYear())}${this.utilsService.getDateNumber(userSelections.date.getMonth() + 1)}${this.utilsService.getDateNumber(userSelections.date.getDate())}`,
          time: userSelections.time.replace(':', '').toString(),
        },
      };
      const response = await axios.post(RESTAURANT_CHECK_AVAILABILITY_URL, body);
      return response.data;
    } catch (err) {
      this.logger.error(this.getRestaurantAvailability.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  async isRestaurantAvailable(restaurantSlug: string, userSelections: IUserSelections): Promise<IOntopoRestaurantAvailability> {
    const restaurantAvailabilityRes = await this.getRestaurantAvailability(restaurantSlug, userSelections);
    const isAvailable = this.getIsRestaurantAvailable(restaurantAvailabilityRes, userSelections);
    return { isAvailable };
  }

  getIsRestaurantAvailable(restaurantAvailabilityRes, userSelections: IUserSelections): boolean {
    const { areas } = restaurantAvailabilityRes || [];
    const relevantArea = areas.find((area) => area.name === userSelections.area);
    if (!relevantArea) {
      return false;
    }

    const relevantTime = relevantArea.options.find((option) => option.time === userSelections.time.replace(':', ''));
    return relevantTime?.method === 'seat';
  }
}
