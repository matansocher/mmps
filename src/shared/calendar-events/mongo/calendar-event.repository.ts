import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from '.';
import type { CalendarEvent, CreateCalendarEventData, UpsertCalendarEventsResult } from '../types';

const getCollection = () => getMongoCollection<CalendarEvent>(DB_NAME, 'events');

export async function upsertCalendarEvents(events: CreateCalendarEventData[]): Promise<UpsertCalendarEventsResult> {
  const collection = getCollection();
  const now = new Date();

  let inserted = 0;
  let updated = 0;

  for (const event of events) {
    const result = await collection.updateOne(
      { googleEventId: event.googleEventId },
      {
        $set: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          updatedAt: now,
        },
        $setOnInsert: {
          googleEventId: event.googleEventId,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted++;
    } else if (result.modifiedCount > 0) {
      updated++;
    }
  }

  return { inserted, updated, total: events.length };
}

export async function getUpcomingEvents(fromDate: Date = new Date(), limit = 10): Promise<CalendarEvent[]> {
  const collection = getCollection();

  return collection
    .find({
      $or: [{ 'start.dateTime': { $gte: fromDate.toISOString() } }, { 'start.date': { $gte: fromDate.toISOString().split('T')[0] } }],
    })
    .sort({ 'start.dateTime': 1, 'start.date': 1 })
    .limit(limit)
    .toArray();
}

export async function getEventsForDate(date: Date = new Date()): Promise<CalendarEvent[]> {
  const collection = getCollection();

  // Format date as YYYY-MM-DD for comparison
  const dateStr = date.toISOString().split('T')[0];
  const nextDateStr = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return collection
    .find({
      $or: [
        // Timed events: start.dateTime starts with the date string (e.g., "2026-01-20T...")
        { 'start.dateTime': { $gte: `${dateStr}T00:00:00`, $lt: `${nextDateStr}T00:00:00` } },
        // All-day events: start.date matches exactly
        { 'start.date': dateStr },
      ],
    })
    .sort({ 'start.dateTime': 1, 'start.date': 1 })
    .toArray();
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  return getEventsForDate(new Date());
}

export async function getEventByGoogleId(googleEventId: string): Promise<CalendarEvent | null> {
  const collection = getCollection();
  return collection.findOne({ googleEventId });
}

export async function deleteEventByGoogleId(googleEventId: string): Promise<boolean> {
  const collection = getCollection();
  const result = await collection.deleteOne({ googleEventId });
  return result.deletedCount > 0;
}
