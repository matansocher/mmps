import type { TrainTravel } from '@services/israel-rail';
import { buildRailRouteImage } from '../../tool-images';
import type { ImagePreview } from './types';

const station = (id: number, nameEn: string, nameHe: string) => ({ id, nameEn, nameHe });
const TEL_AVIV = station(3700, 'Tel Aviv - Savidor Center', 'תל אביב - סבידור מרכז');
const LOD = station(5000, 'Lod', 'לוד');
const BEER_SHEVA = station(7320, 'Beer Sheva - Center', 'באר שבע - מרכז');
const HAIFA = station(2300, 'Haifa - Hof HaKarmel', 'חיפה - חוף הכרמל');

const TRAVELS: readonly TrainTravel[] = [
  {
    date: '2026-10-19',
    departureTime: '15:10',
    arrivalTime: '16:32',
    durationMinutes: 82,
    transfers: 1,
    transferDetails: [{ station: LOD, arrivalTime: '15:28', arrivalPlatform: 2, departureTime: '15:41', departurePlatform: 4, waitMinutes: 13, nextTrainNumber: 512 }],
    legs: [
      { trainNumber: 133, from: TEL_AVIV, to: LOD, departureTime: '15:10', arrivalTime: '15:28', originPlatform: 3, destinationPlatform: 2, delayMinutes: 0, intermediateStops: 2, stops: [] },
      { trainNumber: 512, from: LOD, to: BEER_SHEVA, departureTime: '15:41', arrivalTime: '16:32', originPlatform: 4, destinationPlatform: 1, delayMinutes: 4, intermediateStops: 3, stops: [] },
    ],
  },
  {
    date: '2026-10-19',
    departureTime: '15:25',
    arrivalTime: '16:24',
    durationMinutes: 59,
    transfers: 0,
    transferDetails: [],
    legs: [{ trainNumber: 61, from: TEL_AVIV, to: HAIFA, departureTime: '15:25', arrivalTime: '16:24', originPlatform: 1, destinationPlatform: 2, delayMinutes: 0, intermediateStops: 4, stops: [] }],
  },
];

const toolResults = [{ toolName: 'israel_rail', data: { trains: TRAVELS } }];

export const RAIL_PREVIEWS: readonly ImagePreview[] = [
  { name: 'rail-he', render: () => buildRailRouteImage(toolResults, 'הרכבות הבאות: 15:10 ו-15:25') },
  { name: 'rail-en', render: () => buildRailRouteImage(toolResults, 'Next trains: 15:10 and 15:25') },
];
