import type { ObjectId } from 'mongodb';

export type CalendarEventDateTime = {
  readonly dateTime?: string; // ISO 8601 format
  readonly date?: string; // YYYY-MM-DD for all-day events
  readonly timeZone?: string;
};

export type CalendarEvent = {
  readonly _id: ObjectId;
  readonly googleEventId: string;
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly start: CalendarEventDateTime;
  readonly end: CalendarEventDateTime;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateCalendarEventData = {
  readonly googleEventId: string;
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly start: CalendarEventDateTime;
  readonly end: CalendarEventDateTime;
};

export type UpsertCalendarEventsResult = {
  readonly inserted: number;
  readonly updated: number;
  readonly total: number;
};
