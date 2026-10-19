import { addDays, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { AgendaBlock, AgendaDay, AgendaEvent } from './types';

export const MAX_AGENDA_DAYS = 4;
// Short events still take this much room, so overlap detection matches what is drawn.
export const MIN_VISUAL_MINUTES = 30;

const MINUTES_IN_DAY = 24 * 60;

type Segment = {
  readonly event: AgendaEvent;
  readonly date: string;
  readonly startMinute: number;
  readonly endMinute: number;
};

function nextDate(date: string): string {
  return format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
}

function zoned(iso: string): { readonly date: string; readonly minute: number } {
  const value = toZonedTime(new Date(iso), DEFAULT_TIMEZONE);
  return { date: format(value, 'yyyy-MM-dd'), minute: value.getHours() * 60 + value.getMinutes() };
}

function allDayDates({ start, end }: AgendaEvent): string[] {
  const first = start.slice(0, 10);
  const last = end ? end.slice(0, 10) : nextDate(first);
  const dates = [first];
  for (let date = nextDate(first); date < last && dates.length < 366; date = nextDate(date)) {
    dates.push(date);
  }
  return dates;
}

// Splits a timed event into one segment per day it touches.
function timedSegments(event: AgendaEvent): Segment[] {
  const start = zoned(event.start);
  const end = event.end ? zoned(event.end) : start;
  if (end.date < start.date || (end.date === start.date && end.minute < start.minute)) {
    return [{ event, date: start.date, startMinute: start.minute, endMinute: start.minute }];
  }
  const segments: Segment[] = [];
  for (let date = start.date; date <= end.date && segments.length < 366; date = nextDate(date)) {
    const startMinute = date === start.date ? start.minute : 0;
    const endMinute = date === end.date ? end.minute : MINUTES_IN_DAY;
    if (date !== start.date && endMinute === 0) break;
    segments.push({ event, date, startMinute, endMinute });
  }
  return segments;
}

// Greedy column assignment inside each cluster of overlapping events.
function layoutBlocks(segments: readonly Segment[]): AgendaBlock[] {
  const sorted = [...segments].sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
  const blocks: AgendaBlock[] = [];
  let cluster: { segment: Segment; column: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    cluster.forEach(({ segment, column }) => blocks.push({ event: segment.event, startMinute: segment.startMinute, endMinute: segment.endMinute, column, columns: columnEnds.length }));
    cluster = [];
    columnEnds = [];
  };

  sorted.forEach((segment) => {
    const visualEnd = Math.max(segment.endMinute, segment.startMinute + MIN_VISUAL_MINUTES);
    if (segment.startMinute >= clusterEnd) flush();
    let column = columnEnds.findIndex((end) => end <= segment.startMinute);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(visualEnd);
    } else {
      columnEnds[column] = visualEnd;
    }
    cluster.push({ segment, column });
    clusterEnd = Math.max(clusterEnd, visualEnd);
  });
  flush();
  return blocks;
}

export function buildAgendaDays(events: readonly AgendaEvent[], days?: readonly string[]): AgendaDay[] {
  const valid = events.filter((event) => event.start && !Number.isNaN(new Date(event.start).getTime()));
  const allDayEvents = valid.filter((event) => event.allDay).map((event) => ({ event, dates: allDayDates(event) }));
  const segments = valid.filter((event) => !event.allDay).flatMap(timedSegments);

  const dates = days?.length ? [...new Set(days)] : [...new Set([...segments.map((segment) => segment.date), ...allDayEvents.map(({ dates }) => dates[0])])];
  return dates.sort().map((date) => ({
    date,
    allDay: allDayEvents.filter(({ dates }) => dates.includes(date)).map(({ event }) => event),
    blocks: layoutBlocks(segments.filter((segment) => segment.date === date)),
  }));
}
