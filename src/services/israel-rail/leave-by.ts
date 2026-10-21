import { STATION_BUFFER_MINUTES } from './constants';

// Format: "HH:mm" - when to leave a place to catch a train departing at departureTime after a walk of walkingMinutes plus the station buffer.
export function getLeaveByTime(departureTime: string, walkingMinutes: number, bufferMinutes = STATION_BUFFER_MINUTES): string {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = (((hours * 60 + minutes - walkingMinutes - bufferMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
