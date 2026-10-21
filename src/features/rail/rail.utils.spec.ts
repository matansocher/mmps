import type { TrainTravel } from '@services/israel-rail';
import {
  appendSourceFooter,
  buildCallbackData,
  buildRouteKeyboard,
  formatRouteMessage,
  formatSourceFooter,
  formatStopsMessage,
  formatTrainLine,
  getAnswerSources,
  getNextSearchTime,
  getRefreshSearchTime,
  getRouteContext,
  getUserLanguage,
  parseCallbackData,
} from './rail.utils';
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
    legs: [{ trainNumber: 123, from: FROM, to: TO, departureTime: '08:00', arrivalTime: '08:55', originPlatform: 3, destinationPlatform: 1, delayMinutes: 0, intermediateStops: 0, stops: [] }],
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

  test('should round-trip a stops request', () => {
    const request = { action: 'stops' as const, fromStationId: 3700, toStationId: 2300, date: '2026-10-19', time: '08:00', language: 'en' as const };
    expect(parseCallbackData(buildCallbackData(request))).toEqual(request);
  });

  test('should round-trip a refresh request', () => {
    const request = { action: 'refresh' as const, fromStationId: 3700, toStationId: 2300, date: '2026-10-19', time: '07:50', language: 'en' as const };
    expect(parseCallbackData(buildCallbackData(request))).toEqual(request);
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

describe('getRefreshSearchTime()', () => {
  test.each([
    { now: '2026-10-19 08:30', expected: { date: '2026-10-19', time: '08:30' } },
    { now: '2026-10-19 07:00', expected: { date: '2026-10-19', time: '07:50' } },
    { now: '2026-10-20 00:05', expected: { date: '2026-10-20', time: '00:05' } },
  ])('should return $expected when now is $now', ({ now, expected }) => {
    expect(getRefreshSearchTime('2026-10-19', '07:50', new Date(now.replace(' ', 'T')))).toEqual(expected);
  });
});

describe('getAnswerSources()', () => {
  test.each([
    { toolResults: [{ toolName: 'israel_rail', data: CONTEXT }], expected: ['israel-rail'] },
    { toolResults: [{ toolName: 'light_rail', data: { departures: [{}] } }], expected: ['light-rail'] },
    {
      toolResults: [
        { toolName: 'light_rail', data: { departures: [{}] } },
        { toolName: 'israel_rail', data: CONTEXT },
      ],
      expected: ['israel-rail', 'light-rail'],
    },
    {
      toolResults: [
        { toolName: 'israel_rail', data: { error: 'Unknown' } },
        { toolName: 'light_rail', data: { stations: [{}] } },
      ],
      expected: [],
    },
    { toolResults: [], expected: [] },
  ])('should return $expected', ({ toolResults, expected }) => {
    expect(getAnswerSources(toolResults)).toEqual(expected);
  });
});

describe('formatSourceFooter()', () => {
  test.each([
    { source: 'israel-rail' as const, language: 'en' as const, refreshed: false, expected: '_🕒 Updated 08:01 · rail.co.il_' },
    { source: 'israel-rail' as const, language: 'he' as const, refreshed: false, expected: '_🕒 עודכן 08:01 · rail.co.il_' },
    { source: 'israel-rail' as const, language: 'en' as const, refreshed: true, expected: '_🔄 Updated 08:01 · rail.co.il (refreshed)_' },
    { source: 'israel-rail' as const, language: 'he' as const, refreshed: true, expected: '_🔄 עודכן 08:01 · rail.co.il (רוענן)_' },
    { source: 'light-rail' as const, language: 'en' as const, refreshed: false, expected: '_🗓 Scheduled timetable (MOT GTFS) · no live data_' },
    { source: 'light-rail' as const, language: 'he' as const, refreshed: false, expected: '_🗓 לוח זמנים מתוכנן (GTFS משרד התחבורה) · ללא נתוני זמן אמת_' },
  ])('should format $source footer in $language (refreshed: $refreshed)', ({ source, language, refreshed, expected }) => {
    expect(formatSourceFooter(source, '08:01', language, refreshed)).toEqual(expected);
  });
});

describe('appendSourceFooter()', () => {
  test('should append one footer line per source', () => {
    expect(appendSourceFooter('answer', ['israel-rail', 'light-rail'], '08:01', 'en').split('\n')).toEqual([
      'answer',
      '',
      '_🕒 Updated 08:01 · rail.co.il_',
      '_🗓 Scheduled timetable (MOT GTFS) · no live data_',
    ]);
  });

  test('should keep the message as is when there are no sources', () => {
    expect(appendSourceFooter('answer', [], '08:01', 'en')).toEqual('answer');
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
  test('should build a stops button per train, then later-trains, reverse-direction and refresh buttons', () => {
    const rows = buildRouteKeyboard(CONTEXT, 'he').inline_keyboard.filter((row) => row.length);
    expect(rows.map((row) => row.map((b) => [b.text, 'callback_data' in b ? b.callback_data : null]))).toEqual([
      [
        ['🛤 08:00', 'stops|3700|2300|2026-10-19|08:00|he'],
        ['🛤 08:30', 'stops|3700|2300|2026-10-19|08:30|he'],
      ],
      [
        ['⏭ רכבות מאוחרות יותר', 'later|3700|2300|2026-10-19|08:31|he'],
        ['🔁 כיוון הפוך', 'reverse|2300|3700|2026-10-19|07:50|he'],
        ['🔄 רענון', 'refresh|3700|2300|2026-10-19|07:50|he'],
      ],
    ]);
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
    {
      travel: buildTravel({ legs: [{ ...buildTravel().legs[0], predictedLoadPercent: 25 }] }),
      language: 'en' as const,
      expected: '• 08:00 → 08:55 · 55 min · platform 3 · direct · 🟢 quiet',
    },
    {
      travel: buildTravel({ legs: [{ ...buildTravel().legs[0], predictedLoadPercent: 82 }] }),
      language: 'he' as const,
      expected: '• 08:00 ← 08:55 · 55 דק׳ · רציף 3 · ישירה · 🔴 עומס גבוה',
    },
    {
      travel: buildTravel({
        transfers: 1,
        legs: [
          { ...buildTravel().legs[0], predictedLoadPercent: 20 },
          { ...buildTravel().legs[0], predictedLoadPercent: 55 },
        ],
      }),
      language: 'en' as const,
      expected: '• 08:00 → 08:55 · 55 min · platform 3 · 1 transfer · 🟡 moderate',
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

describe('formatStopsMessage()', () => {
  const MIDDLE = { id: 3500, nameEn: 'Herzliya', nameHe: 'הרצליה' };
  const leg = { ...buildTravel().legs[0], intermediateStops: 1, stops: [{ station: MIDDLE, arrivalTime: '08:08', departureTime: '08:09', platform: 6 }] };

  test.each([
    {
      language: 'en' as const,
      expected: [
        '🛤 *Train 123 · Tel Aviv - Savidor Center → Haifa - Hof HaCarmel*',
        '08:00 · *Tel Aviv - Savidor Center* (platform 3)',
        '08:09 · Herzliya',
        '08:55 · *Haifa - Hof HaCarmel* (platform 1)',
      ],
    },
    {
      language: 'he' as const,
      expected: ['🛤 *רכבת 123 · תל אביב - סבידור מרכז ← חיפה - חוף הכרמל*', '08:00 · *תל אביב - סבידור מרכז* (רציף 3)', '08:09 · הרצליה', '08:55 · *חיפה - חוף הכרמל* (רציף 1)'],
    },
  ])('should list every stop of the train in $language', ({ language, expected }) => {
    expect(formatStopsMessage(buildTravel({ legs: [leg] }), language).split('\n')).toEqual(expected);
  });

  test('should list each leg separately when the trip has a transfer', () => {
    const second = { ...leg, trainNumber: 456, from: MIDDLE, departureTime: '08:20', stops: [] };
    const message = formatStopsMessage(buildTravel({ transfers: 1, legs: [{ ...leg, to: MIDDLE, stops: [] }, second] }), 'en');
    expect(message.split('\n\n')).toEqual([
      '🛤 *Train 123 · Tel Aviv - Savidor Center → Herzliya*\n08:00 · *Tel Aviv - Savidor Center* (platform 3)\n08:55 · *Herzliya* (platform 1)',
      '🛤 *Train 456 · Herzliya → Haifa - Hof HaCarmel*\n08:20 · *Herzliya* (platform 3)\n08:55 · *Haifa - Hof HaCarmel* (platform 1)',
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
