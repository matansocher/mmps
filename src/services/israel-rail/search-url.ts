import { RAIL_WEBSITE_URL } from './constants';

export type RailSearchUrlParams = {
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly time: string; // Format: "HH:mm"
};

export function buildRailSearchUrl({ fromStationId, toStationId, date, time }: RailSearchUrlParams): string {
  const [hours = '00', minutes = '00'] = time.split(':');
  const params = new URLSearchParams({
    page: 'routePlanSearchResults',
    fromStation: String(fromStationId),
    toStation: String(toStationId),
    date,
    hours: hours.padStart(2, '0'),
    minutes: minutes.padStart(2, '0'),
    scheduleType: '1',
  });
  return `${RAIL_WEBSITE_URL}/?${params.toString()}`;
}
