import { differenceInCalendarDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import type { TrainLine, TrainProgress } from './types';

const MINUTES_PER_DAY = 24 * 60;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Stop times are "HH:mm" only, so a line running past midnight wraps; keep them increasing.
function getStopMinutes(line: TrainLine): number[] {
  let dayOffset = 0;
  let previous = -1;
  return line.stops.map(({ time }) => {
    let minutes = toMinutes(time) + dayOffset;
    if (minutes < previous) {
      dayOffset += MINUTES_PER_DAY;
      minutes += MINUTES_PER_DAY;
    }
    previous = minutes;
    return minutes;
  });
}

// Minutes since midnight (Israel time) of the line's date, so a train on yesterday's date gets a value above 1440.
function getNowMinutes(line: TrainLine, now: Date): number {
  const zoned = toZonedTime(now, DEFAULT_TIMEZONE);
  const dayOffset = differenceInCalendarDays(zoned, new Date(`${line.date}T00:00:00`));
  return dayOffset * MINUTES_PER_DAY + toMinutes(format(zoned, 'HH:mm'));
}

// The live feed hasn't reported arrival at the next station yet, so never draw the train on top of it.
const MAX_LIVE_FRACTION = 0.9;

function interpolate(fromIndex: number, toIndex: number, fromMinutes: number, toMinutes: number, nowMinutes: number, maxFraction = 1): number {
  if (toMinutes <= fromMinutes) return fromIndex + (toIndex - fromIndex) / 2;
  const fraction = Math.min(Math.max((nowMinutes - fromMinutes) / (toMinutes - fromMinutes), 0), maxFraction);
  return fromIndex + fraction * (toIndex - fromIndex);
}

function estimateFromTimetable(stopMinutes: readonly number[], nowMinutes: number): TrainProgress {
  const lastIndex = stopMinutes.length - 1;
  if (nowMinutes < stopMinutes[0]) return { status: 'not_started', position: 0, delayMinutes: 0, isLive: false };
  if (nowMinutes >= stopMinutes[lastIndex]) return { status: 'finished', position: lastIndex, delayMinutes: 0, isLive: false };
  const nextIndex = stopMinutes.findIndex((minutes) => minutes > nowMinutes);
  return { status: 'running', position: interpolate(nextIndex - 1, nextIndex, stopMinutes[nextIndex - 1], stopMinutes[nextIndex], nowMinutes), delayMinutes: 0, isLive: false };
}

// Places the train on its line. Uses rail.co.il's live position (last/next station + delay) and only interpolates
// between those two stations; falls back to the timetable alone when there's no live position.
export function estimateTrainProgress(line: TrainLine, now: Date = new Date()): TrainProgress {
  const stopMinutes = getStopMinutes(line);
  const nowMinutes = getNowMinutes(line, now);
  const lastIndex = line.stops.length - 1;
  const { position } = line;
  const lastStationIndex = position ? line.stops.findIndex((stop) => stop.station.id === position.lastStationId) : -1;
  if (!position || lastStationIndex === -1) return estimateFromTimetable(stopMinutes, nowMinutes);

  const { delayMinutes } = position;
  if (lastStationIndex === lastIndex) return { status: 'finished', position: lastIndex, delayMinutes, isLive: true };
  if (!position.nextStationId) return { status: 'running', position: lastStationIndex, delayMinutes, isLive: true };

  const foundNext = line.stops.findIndex((stop, index) => index > lastStationIndex && stop.station.id === position.nextStationId);
  const nextIndex = foundNext === -1 ? lastStationIndex + 1 : foundNext;
  const estimated = interpolate(lastStationIndex, nextIndex, stopMinutes[lastStationIndex] + delayMinutes, stopMinutes[nextIndex] + delayMinutes, nowMinutes, MAX_LIVE_FRACTION);
  return { status: 'running', position: estimated, delayMinutes, isLive: true };
}
