import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IOntopoRestaurant, IOntopoRestaurantArea, IOntopoRestaurantAvailability, IUserSelections } from '@services/ontopo/interface';
import { ANY_AREA, RESTAURANT_CHECK_AVAILABILITY_URL } from '@services/ontopo/ontopo.config';
import { OntopoApiUtils } from './ontopo-api.utils';

@Injectable()
export class OntopoApiService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly ontopoApiUtils: OntopoApiUtils,
  ) {
    // this.init(); // $$$$$$$$$$$$$$$$
  }

  async init() {
    // const restaurantDetails = await this.getRestaurantDetails(`https://ontopo.com/he/il/page/45869402`); // kazan
    const restaurantDetails = await this.getRestaurantDetails(`https://ontopo.com/he/il/page/88542392`); // ocd
    const userSelections = { size: 2, date: this.ontopoApiUtils.getNextMondayDate(), time: '18:00', area: 'Inside' };
    const { isAvailable } = await this.isRestaurantAvailable(restaurantDetails.slug, userSelections);
    return { restaurantDetails, isAvailable };
  }

  async getRestaurantDetails(restaurantUrl: string): Promise<IOntopoRestaurant> {
    try {
      const restaurantDetailsRes = await axios.get(restaurantUrl);
      const dom = new JSDOM(restaurantDetailsRes.data, { runScripts: 'dangerously' });
      const restaurantDetails = dom.window['__INITIAL_STATE__'];
      if (!restaurantDetails) {
        throw new Error('restaurant details not found');
      }

      const restaurantSlug = restaurantDetails?.websiteContentStore?.pageData?.slug;
      const restaurantAreasRes = await this.getRestaurantAreas(restaurantSlug);
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
      return areas?.map((area) => ({
        name: area.id,
        displayName: area.name,
      })) || [];
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
    if (!areas?.length) {
      return false;
    }

    const relevantArea = areas?.find((area) => area.name === userSelections.area);
    if (relevantArea) {
      const relevantTime = relevantArea.options?.find((option) => option.time === userSelections.time.replace(':', ''));
      return relevantTime?.method === 'seat';
    }

    // $$$$$$$$$$$$$$$$$$$$ test this area
    // ANY_AREA - handle Anywhere case $$$$$$$$$$$$$$$$$$$$ u let the user choose `anywhere` when no areas available - u want to check any area
    // there are areas but the user chose an area that is not available - let suggest the available areas
    if (userSelections.area === ANY_AREA) {
      return areas.some((area) => {
        const relevantTime = area.options?.find((option) => option.time === userSelections.time.replace(':', ''));
        return relevantTime?.method === 'seat';
      });
    }

    return false;
  }
}