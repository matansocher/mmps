import { Injectable } from '@nestjs/common';
import { DAYS_OF_WEEK } from '@core/config/main.config';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IOntopoRestaurantReservationHours } from '@services/ontopo/interface';

@Injectable()
export class OntopoApiUtils {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  getRestaurantReservationHours(shifts): IOntopoRestaurantReservationHours {
    const { shifts: restaurantShifts } = shifts || {};
    const { time, opening = [] } = restaurantShifts;
    const step = time?.step || 30;
    const openingHours = {};

    opening.forEach((shift) => {
      const { hours, __criteria } = shift;
      if (!hours) return;

      const [from, to] = hours.a?.time?.split('-');
      if (!from || !to) return;

      const abbreviatedDays = this.getAbbreviatedDays(__criteria.weekday);
      abbreviatedDays.forEach((day) => (openingHours[day] = { from: this.getHourString(from), to: this.getHourString(to), step }));
    });

    return openingHours;
  }

  getHourString(hour: string): string {
    const hourArr = hour.split('');
    hourArr.splice(2, 0, ':');
    return hourArr.join('');
  }

  getAbbreviatedDays(weekdays) {
    let abbreviatedDays = [];
    if (weekdays.includes('-')) {
      const [start, end] = weekdays.split('-').map(Number);
      abbreviatedDays = DAYS_OF_WEEK.slice(start, end + 1);
    } else {
      abbreviatedDays = [DAYS_OF_WEEK[weekdays]];
    }
    return abbreviatedDays.map((day) => day.slice(0, 3).toLowerCase());
  }

  getNextMondayDate(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;

    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);

    return nextMonday;
  }
}
