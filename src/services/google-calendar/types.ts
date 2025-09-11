export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface CalendarListOptions {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  q?: string; // Free text search terms
  singleEvents?: boolean;
}
