import { Injectable } from '@nestjs/common';
import { DAYS_OF_WEEK } from '@core/config/main.config';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { IOntopoRestaurantReservationHours } from '../interface';

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
    const reservationHours = {};

    opening
      .filter((shift) => shift.tag !== 'close')
      .forEach((shift) => {
        const { weekday } = shift.__criteria;
        const timeRanges = shift.hours ? Object.values(shift.hours).map((h: any) => h.time).filter(Boolean) : [];

        // If no valid time ranges, skip
        if (timeRanges.length === 0) return;

        const parsedHours = timeRanges.map((time: string) => {
          const [from, to] = time.split('-');
          return { from: this.formatTime(from), to: this.formatTime(to), step };
        });

        const weekdays = weekday.split(',').flatMap((range: string) => {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          }
          return [Number(range)];
        });

        weekdays.forEach((day: number) => {
          const dayKey = DAYS_OF_WEEK[day]?.slice(0, 3).toLowerCase();
          if (dayKey) {
            reservationHours[dayKey] = reservationHours[dayKey] ? [...reservationHours[dayKey]!, ...parsedHours] : parsedHours;
          }
        });
      });

    return reservationHours;
  }

  formatTime(time: string): string {
    return time.slice(0, 2) + ':' + time.slice(2);
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
