import { google } from 'googleapis';
import { env } from 'node:process';
import { CalendarCredentials } from './types';

let calendar: any = null;

export function provideCalendar() {
  if (calendar) {
    return calendar;
  }

  const credentials = JSON.parse(env.GOOGLE_CALENDAR_CREDENTIALS) as CalendarCredentials;

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendar = google.calendar({ version: 'v3', auth: auth });
  return calendar;
}
