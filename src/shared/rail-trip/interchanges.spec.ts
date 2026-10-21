import { RAIL_STATIONS } from '@services/israel-rail';
import type { LightRailStation } from '@services/light-rail';
import { findRailTripInterchanges } from './interchanges';

const RED_LINE_STOPS: LightRailStation[] = [
  { id: '48769', nameHe: 'ארלוזורוב', nameEn: 'Arlozorov', lat: 32.081554, lon: 34.796524 },
  { id: '48692', nameHe: 'שאול המלך', nameEn: "Sha'ul HaMelekh", lat: 32.076636, lon: 34.792005 },
  { id: '48725', nameHe: 'אלנבי', nameEn: 'Allenby', lat: 32.062791, lon: 34.775131 },
  { id: '48716', nameHe: 'הקוממיות', nameEn: 'HaKomemiyut', lat: 32.002287, lon: 34.746818 },
  { id: '48554', nameHe: 'קרית אריה', nameEn: 'Kiriyat Arieh', lat: 32.105931, lon: 34.861896 },
];

describe('findRailTripInterchanges()', () => {
  test('should pair the real train stations within 400 m of a Red Line stop', () => {
    const pairs = findRailTripInterchanges(RAIL_STATIONS, RED_LINE_STOPS).map(({ railStation, lightRailStation }) => [railStation.id, lightRailStation.nameEn]);
    expect(pairs.sort()).toEqual([
      [3700, 'Arlozorov'],
      [4170, 'Kiriyat Arieh'],
      [4600, "Sha'ul HaMelekh"],
    ]);
  });

  test('should pick the nearest stop and add a walking estimate', () => {
    const railStations = [{ id: 1, nameEn: 'Rail', nameHe: 'רכבת', lat: 32.08, lon: 34.79 }];
    const stops: LightRailStation[] = [
      { id: 'far', nameEn: 'Far', nameHe: 'רחוק', lat: 32.083, lon: 34.79 },
      { id: 'near', nameEn: 'Near', nameHe: 'קרוב', lat: 32.081, lon: 34.79 },
    ];
    const [interchange] = findRailTripInterchanges(railStations, stops);
    expect(interchange.lightRailStation.id).toEqual('near');
    expect(Math.round(interchange.straightLineMeters)).toEqual(111);
    expect(interchange.walkingMinutes).toBeGreaterThan(0);
    expect(interchange.walkingMeters).toBeGreaterThan(interchange.straightLineMeters);
  });

  test('should skip stations farther than the radius', () => {
    const railStations = [{ id: 1, nameEn: 'Rail', nameHe: 'רכבת', lat: 32.08, lon: 34.79 }];
    const stops: LightRailStation[] = [{ id: 'far', nameEn: 'Far', nameHe: 'רחוק', lat: 32.085, lon: 34.79 }];
    expect(findRailTripInterchanges(railStations, stops)).toEqual([]);
  });
});
