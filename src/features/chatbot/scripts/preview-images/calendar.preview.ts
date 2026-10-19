import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { generateAgendaImage } from '@shared/agenda-image';
import { buildCalendarAgendaImage } from '../../tool-images';
import type { ToolResult } from '../../types';
import type { ImagePreview } from './types';

const today = toZonedTime(new Date(), DEFAULT_TIMEZONE);
const day = (offset: number) => format(addDays(today, offset), 'yyyy-MM-dd');
const at = (offset: number, time: string) => `${day(offset)}T${time}:00+03:00`;

let nextId = 0;
const timed = (title: string, offset: number, from: string, to: string, location: string | null = null) => ({
  id: `e${nextId++}`,
  title,
  start: at(offset, from),
  end: at(offset, to),
  allDay: false,
  location,
});
const allDay = (title: string, offset: number, days = 1) => ({ id: `e${nextId++}`, title, start: day(offset), end: day(offset + days), allDay: true, location: null });

const TOMORROW_HE = [
  allDay('יום הולדת לדנה', 1),
  timed('ישיבת צוות שבועית', 1, '09:00', '10:00', 'Zoom'),
  timed('Design review', 1, '09:30', '10:30', 'Meeting room 3'),
  timed('קפה עם יואב', 1, '11:00', '11:15'),
  timed('רופא שיניים', 1, '13:00', '14:00', 'ויצמן 12, כפר סבא'),
  timed('Gym', 1, '18:30', '19:30', 'Holmes Place'),
];

const WEEK_EN = [
  timed('Standup', 0, '09:30', '09:45', 'Zoom'),
  timed('1:1 with Noa', 0, '11:00', '11:30'),
  timed('Lunch with Avi', 0, '12:30', '13:30', 'Benedict, Rothschild 29'),
  allDay('Vacation in Eilat', 1, 2),
  timed('Flight to Eilat', 1, '07:00', '08:00', 'Ben Gurion Airport'),
  timed('Dinner', 2, '20:00', '22:00', 'Pastory'),
  timed('Quarterly planning', 3, '10:00', '12:00'),
  timed('Product sync', 3, '11:00', '12:30'),
  timed('Haircut', 4, '17:00', '17:30'),
  timed('Football', 5, '20:00', '21:30'),
];

const calendarResult = (events: readonly unknown[]): ToolResult[] => [{ toolName: 'calendar', data: { message: `Found ${events.length} events`, events } }];

const SCHEDULER_EVENTS = TOMORROW_HE.map(({ title, start, end, allDay, location }) => ({ title, start, end, allDay, location: location ?? undefined }));

export const CALENDAR_PREVIEWS: readonly ImagePreview[] = [
  { name: 'calendar-day-he', render: () => buildCalendarAgendaImage(calendarResult(TOMORROW_HE), 'מחר יש לך 5 אירועים, ויש חפיפה בין ישיבת הצוות ל-Design review.') },
  { name: 'calendar-week-en', render: () => buildCalendarAgendaImage(calendarResult(WEEK_EN), 'Here is your week: a busy Thursday and a short trip to Eilat.') },
  { name: 'calendar-daily-summary-en', render: () => generateAgendaImage(SCHEDULER_EVENTS, { language: 'en', days: [day(1)] }) },
];
