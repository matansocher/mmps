import { google } from 'googleapis';
import { env } from 'node:process';

let calendar: any = null;

// OAuth (acting as the calendar owner) is required to invite attendees; service accounts can't on personal calendars
function createAuth() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, GOOGLE_CALENDAR_REFRESH_TOKEN } = env;
  if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GOOGLE_CALENDAR_REFRESH_TOKEN) {
    const oauth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI || 'http://localhost:3000');
    oauth.setCredentials({ refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN });
    return oauth;
  }
  return new google.auth.JWT({
    email: env.GOOGLE_CALENDAR_CLIENT_EMAIL,
    key: env.GOOGLE_CALENDAR_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

export function provideCalendar() {
  if (calendar) {
    return calendar;
  }
  calendar = google.calendar({ version: 'v3', auth: createAuth() });
  return calendar;
}
