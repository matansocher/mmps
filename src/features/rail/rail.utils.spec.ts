import type { TrainTravel } from '@services/israel-rail';
import { buildCallbackData, buildRouteKeyboard, formatRouteMessage, formatTrainLine, getNextSearchTime, getRouteContext, getUserLanguage, parseCallbackData } from './rail.utils';
import type { RailRouteContext } from './rail.utils';

const FROM = { id: 3700, nameEn: 'Tel Aviv - Savidor Center', nameHe: 'תל אביב - סבידור מרכז' };
const TO = { id: 2300, nameEn: 'Haifa - Hof HaCarmel', nameHe: 'חיפה - חוף הכרמל' };

function buildTravel(overrides: Partial<TrainTravel> = {}): TrainTravel {
  return {
    date: '2026-10-19',
    departureTime: '08:00',
    arrivalTime: '08:55',
    durationMinutes: 55,
    transfers: 0,
    legs: [{ trainNumber: 123, from: FROM, to: TO, departureTime: '08:00', arrivalTime: '08:55', originPlatform: 3, destinationPlatform: 1, delayMinutes: 0, intermediateStops: 4 }],
    ...overrides,
  } as TrainTravel;
}

const CONTEXT: RailRouteContext = { from: FROM, to: TO, trains: [buildTravel(), buildTravel({ departureTime: '08:30', arrivalTime: '09:25' })], searchedFrom: '2026-10-19 07:50' };

describe('buildCallbackData() / parseCallbackData()', () => {
  test('should round-trip a request and stay under 64 bytes', () => {
    const request = { action: 'later' as const, fromStationId: 3700, toStationId: 2300, date: '2026-10-19', time: '08:31', language: 'he' as const };
    const data = buildCallbackData(request);
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
    expect(parseCallbackData(data)).toEqual(request);
  });

  test.each([
    { data: 'foo|1|2|2026-10-19|08:00|he' },
    { data: 'later|x|2|2026-10-19|08:00|he' },
    { data: 'later|1|2|19-10-2026|08:00|he' },
    { data: 'later|1|2|2026-10-19|8|he' },
    { data: 'later|1|2|2026-10-19|08:00|fr' },
    { data: '' },
  ])('should return null for invalid data "$data"', ({ data }) => {
    expect(parseCallbackData(data)).toEqual(null);
  });
});

describe('getNextSearchTime()', () => {
  test.each([
    { travels: [buildTravel({ departureTime: '08:00' }), buildTravel({ departureTime: '09:15' })], expected: { date: '2026-10-19', time: '09:16' } },
    { travels: [buildTravel({ date: '2026-10-19', departureTime: '23:59' })], expected: { date: '2026-10-20', time: '00:00' } },
    { travels: [], expected: null },
  ])('should return $expected', ({ travels, expected }) => {
    expect(getNextSearchTime(travels)).toEqual(expected);
  });
});

describe('getRouteContext()', () => {
  test('should return the last israel_rail result with trains', () => {
    const toolResults = [
      { toolName: 'israel_rail', data: { ...CONTEXT, trains: [] } },
      { toolName: 'israel_rail', data: CONTEXT },
      { toolName: 'weather', data: {} },
    ];
    expect(getRouteContext(toolResults)).toEqual(CONTEXT);
  });

  test('should return null when there is no rail result', () => {
    expect(getRouteContext([{ toolName: 'weather', data: {} }])).toEqual(null);
  });
});

describe('buildRouteKeyboard()', () => {
  test('should build later-trains and reverse-direction buttons', () => {
    const buttons = buildRouteKeyboard(CONTEXT, 'he').inline_keyboard.flat();
    expect(buttons.map((b) => ('callback_data' in b ? b.callback_data : null))).toEqual(['later|3700|2300|2026-10-19|08:31|he', 'reverse|2300|3700|2026-10-19|07:50|he']);
  });
});

describe('formatTrainLine()', () => {
  test.each([
    { travel: buildTravel(), language: 'he' as const, expected: '• 08:00 ← 08:55 · 55 דק׳ · רציף 3 · ישירה' },
    { travel: buildTravel(), language: 'en' as const, expected: '• 08:00 → 08:55 · 55 min · platform 3 · direct' },
    {
      travel: buildTravel({ transfers: 1, legs: [{ ...buildTravel().legs[0], delayMinutes: 4 }] }),
      language: 'en' as const,
      expected: '• 08:00 → 08:55 · 55 min · platform 3 · 1 transfer · ⚠️ 4 min late',
    },
  ])('should format $language line', ({ travel, language, expected }) => {
    expect(formatTrainLine(travel, language)).toEqual(expected);
  });
});

describe('formatRouteMessage()', () => {
  test('should include header, trains and the rail website link', () => {
    const message = formatRouteMessage(CONTEXT, 'https://www.rail.co.il/?x=1', 'en');
    expect(message.split('\n')).toEqual([
      '🚆 *Tel Aviv - Savidor Center → Haifa - Hof HaCarmel*',
      '',
      '• 08:00 → 08:55 · 55 min · platform 3 · direct',
      '• 08:30 → 09:25 · 55 min · platform 3 · direct',
      '',
      '[Check on the Israel Railways website](https://www.rail.co.il/?x=1)',
    ]);
  });
});

describe('getUserLanguage()', () => {
  test.each([
    { code: undefined, expected: 'he' },
    { code: 'he', expected: 'he' },
    { code: 'HE-il', expected: 'he' },
    { code: 'en', expected: 'en' },
    { code: 'ru', expected: 'en' },
  ])('should return $expected for $code', ({ code, expected }) => {
    expect(getUserLanguage(code)).toEqual(expected);
  });
});
