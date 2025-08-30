import { google } from 'googleapis';
import { env } from 'node:process';

let calendar: any = null;

export function provideCalendar() {
  if (calendar) {
    return calendar;
  }
  const auth = new google.auth.JWT({
    email: env.GOOGLE_CALENDAR_CLIENT_EMAIL,
    key: env.GOOGLE_CALENDAR_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendar = google.calendar({ version: 'v3', auth: auth });
  return calendar;
}
