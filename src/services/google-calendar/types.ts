export type CalendarEvent = {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  // null clears the field on patch (e.g. when switching between timed and all-day)
  start: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string;
  };
  end: {
    dateTime?: string | null;
    date?: string | null;
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
  recurringEventId?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

export type CalendarListOptions = {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  q?: string; // Free text search terms
  singleEvents?: boolean;
};
