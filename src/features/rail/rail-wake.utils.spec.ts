import type { TrainTravel } from '@services/israel-rail';
import {
  buildWakeButton,
  buildWakeCallbackData,
  buildWakeTrainPickerKeyboard,
  findTravel,
  formatWakeConfirmation,
  formatWakeMessage,
  getArrivalDelayMinutes,
  getNotifyAt,
  getScheduledArrivalAt,
  parseWakeCallbackData,
} from './rail-wake.utils';

const FROM = { id: 3700, nameEn: 'Tel Aviv - Savidor Center', nameHe: 'תל אביב - סבידור מרכז' };
const TO = { id: 2300, nameEn: 'Haifa - Hof HaCarmel', nameHe: 'חיפה - חוף הכרמל' };
const LEG = { trainNumber: 123, from: FROM, to: TO, departureTime: '08:00', arrivalTime: '08:55', originPlatform: 3, destinationPlatform: 1, delayMinutes: 0, intermediateStops: 4, stops: [] };

function buildTravel(overrides: Partial<TrainTravel> = {}): TrainTravel {
  return { date: '2026-10-19', departureTime: '08:00', arrivalTime: '08:55', durationMinutes: 55, transfers: 0, transferDetails: [], legs: [LEG], ...overrides };
}

describe('buildWakeCallbackData() / parseWakeCallbackData()', () => {
  test.each([
    { request: { action: 'wake' as const, fromStationId: 3700, toStationId: 2300, date: '2026-10-19', time: '07:50', language: 'he' as const } },
    { request: { action: 'wakeset' as const, fromStationId: 3700, toStationId: 2300, date: '2026-10-19', time: '08:00', language: 'en' as const } },
    { request: { action: 'wakecancel' as const, alertId: '0123456789abcdef01234567', language: 'he' as const } },
  ])('should round-trip $request.action and stay under 64 bytes', ({ request }) => {
    const data = buildWakeCallbackData(request);
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
    expect(parseWakeCallbackData(data)).toEqual(request);
  });

  test.each([
    { data: 'later|3700|2300|2026-10-19|08:00|he' },
    { data: 'wake|x|2300|2026-10-19|08:00|he' },
    { data: 'wakeset|3700|2300|2026-10-19|8|he' },
    { data: 'wake|3700|2300|2026-10-19|08:00|fr' },
    { data: 'wakecancel|not-an-id|he' },
    { data: '' },
  ])('should return null for invalid data "$data"', ({ data }) => {
    expect(parseWakeCallbackData(data)).toEqual(null);
  });
});

describe('buildWakeButton()', () => {
  test('should use the searched-from date and time', () => {
    expect(buildWakeButton(3700, 2300, '2026-10-19 07:50', 'en')).toEqual({ text: '⏰ Wake me before my stop', data: 'wake|3700|2300|2026-10-19|07:50|en' });
  });
});

describe('buildWakeTrainPickerKeyboard()', () => {
  test('should build one button per train, capped at 5', () => {
    const trains = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'].map((departureTime) => buildTravel({ departureTime }));
    const buttons = buildWakeTrainPickerKeyboard(trains, 3700, 2300, 'en').inline_keyboard.flat();
    expect(buttons.length).toEqual(5);
    expect(buttons[0]).toEqual({ text: '🚆 08:00 → 08:55', callback_data: 'wakeset|3700|2300|2026-10-19|08:00|en' });
  });
});

describe('findTravel()', () => {
  const travels = [buildTravel(), buildTravel({ departureTime: '08:30' }), buildTravel({ departureTime: '08:30', legs: [{ ...LEG, trainNumber: 456 }] })];

  test.each([
    { departureTime: '08:30', trainNumbers: undefined, expected: travels[1] },
    { departureTime: '08:30', trainNumbers: [456], expected: travels[2] },
    { departureTime: '09:00', trainNumbers: undefined, expected: null },
  ])('should find $departureTime with trains $trainNumbers', ({ departureTime, trainNumbers, expected }) => {
    expect(findTravel(travels, '2026-10-19', departureTime, trainNumbers)).toEqual(expected);
  });
});

describe('getScheduledArrivalAt()', () => {
  test.each([
    { travel: buildTravel(), expected: '2026-10-19T05:55:00.000Z' },
    { travel: buildTravel({ departureTime: '23:40', arrivalTime: '00:35' }), expected: '2026-10-19T21:35:00.000Z' },
  ])('should return $expected', ({ travel, expected }) => {
    expect(getScheduledArrivalAt(travel).toISOString()).toEqual(expected);
  });
});

describe('getArrivalDelayMinutes()', () => {
  test.each([
    { legs: [{ ...LEG, delayMinutes: 2, arrivalDelayMinutes: 7 }], expected: 7 },
    { legs: [{ ...LEG, delayMinutes: 3 }], expected: 3 },
    { legs: [], expected: 0 },
  ])('should return $expected', ({ legs, expected }) => {
    expect(getArrivalDelayMinutes(buildTravel({ legs }))).toEqual(expected);
  });
});

describe('getNotifyAt()', () => {
  test.each([
    { delayMinutes: 0, expected: '2026-10-19T05:50:00.000Z' },
    { delayMinutes: 6, expected: '2026-10-19T05:56:00.000Z' },
  ])('should return $expected for a $delayMinutes minute delay', ({ delayMinutes, expected }) => {
    expect(getNotifyAt(new Date('2026-10-19T05:55:00.000Z'), delayMinutes).toISOString()).toEqual(expected);
  });
});

describe('formatWakeConfirmation() / formatWakeMessage()', () => {
  const arrival = new Date('2026-10-19T05:55:00.000Z');

  test('should format the confirmation in local time', () => {
    expect(formatWakeConfirmation(TO, new Date('2026-10-19T05:50:00.000Z'), arrival, 'en')).toEqual(
      "⏰ I'll wake you at 08:50, 5 minutes before you arrive at Haifa - Hof HaCarmel (08:55).\nIf the train is delayed, I'll shift the alert.",
    );
  });

  test.each([
    { delayMinutes: 0, expected: "⏰ Wake up! You're arriving at Haifa - Hof HaCarmel in about 5 minutes - at 08:55 🚆" },
    { delayMinutes: 4, expected: "⏰ Wake up! You're arriving at Haifa - Hof HaCarmel in about 5 minutes - at 08:55 (4 min late) 🚆" },
  ])('should format the wake message with a $delayMinutes minute delay', ({ delayMinutes, expected }) => {
    expect(formatWakeMessage(TO, arrival, delayMinutes, 'en')).toEqual(expected);
  });
});
