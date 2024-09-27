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
  ) {}

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
      const restaurantAreasRes = await this.restaurantAvailabilityApiRequest(restaurantSlug, generalUserSelections);
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

  async restaurantAvailabilityApiRequest(restaurantSlug: string, userSelections: IUserSelections) {
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

  async getRestaurantAvailability(restaurantSlug: string, userSelections: IUserSelections): Promise<IOntopoRestaurantAvailability> {
    const restaurantAvailabilityRes = await this.restaurantAvailabilityApiRequest(restaurantSlug, userSelections);
    const { areas } = restaurantAvailabilityRes || [];
    if (!areas?.length) {
      return { isAvailable: false };
    }

    const relevantArea = areas?.find((area) => area.name === userSelections.area);
    if (relevantArea) {
      const relevantTime = relevantArea.options?.find((option) => option.time === userSelections.time.replace(':', ''));
      const reservationDetails = { date: userSelections.date, time: userSelections.time, size: userSelections.size, area: relevantArea.name };
      return { isAvailable: relevantTime?.method === 'seat', reservationDetails };
    }

    if (userSelections.area === ANY_AREA) {
      for (let i = 0; i < areas.length; i++) {
        const currentArea = areas[i];
        const relevantTime = currentArea.options.find((option) => option.time === userSelections.time.replace(':', ''));
        if (relevantTime) {
          const reservationDetails = { date: userSelections.date, time: userSelections.time, size: userSelections.size, area: currentArea.name };
          return { isAvailable: relevantTime.method === 'seat', reservationDetails };
        }
      }
    }

    return { isAvailable: false };
  }
}
