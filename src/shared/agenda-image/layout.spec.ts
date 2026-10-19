import { generateAgendaImage } from './agenda-image';
import { buildAgendaDays } from './layout';
import type { AgendaEvent } from './types';

const timed = (title: string, start: string, end: string): AgendaEvent => ({ title, start, end, allDay: false });

describe('buildAgendaDays()', () => {
  test('should group events by local (Asia/Jerusalem) day and put all-day events aside', () => {
    const events = [
      timed('Late', '2025-06-10T21:30:00Z', '2025-06-10T22:00:00Z'), // 00:30 on the 11th locally
      timed('Morning', '2025-06-10T06:00:00Z', '2025-06-10T07:00:00Z'),
      { title: 'Holiday', start: '2025-06-10', end: '2025-06-11', allDay: true },
    ];

    const days = buildAgendaDays(events);

    expect(days.map((day) => day.date)).toEqual(['2025-06-10', '2025-06-11']);
    expect(days[0].allDay.map((event) => event.title)).toEqual(['Holiday']);
    expect(days[0].blocks.map((block) => [block.event.title, block.startMinute, block.endMinute])).toEqual([['Morning', 9 * 60, 10 * 60]]);
    expect(days[1].blocks.map((block) => [block.event.title, block.startMinute])).toEqual([['Late', 30]]);
  });

  test('should place overlapping events in separate columns and reuse freed columns', () => {
    const [day] = buildAgendaDays([
      timed('A', '2025-06-10T09:00:00+03:00', '2025-06-10T11:00:00+03:00'),
      timed('B', '2025-06-10T10:00:00+03:00', '2025-06-10T10:30:00+03:00'),
      timed('C', '2025-06-10T10:30:00+03:00', '2025-06-10T11:30:00+03:00'),
      timed('D', '2025-06-10T13:00:00+03:00', '2025-06-10T14:00:00+03:00'),
    ]);

    expect(day.blocks.map((block) => [block.event.title, block.column, block.columns])).toEqual([
      ['A', 0, 2],
      ['B', 1, 2],
      ['C', 1, 2],
      ['D', 0, 1],
    ]);
  });

  test('should treat very short events as overlapping when they would visually collide', () => {
    const [day] = buildAgendaDays([timed('A', '2025-06-10T09:00:00+03:00', '2025-06-10T09:05:00+03:00'), timed('B', '2025-06-10T09:10:00+03:00', '2025-06-10T09:20:00+03:00')]);

    expect(day.blocks.map((block) => block.column)).toEqual([0, 1]);
  });

  test('should split a timed event that crosses midnight', () => {
    const days = buildAgendaDays([timed('Night', '2025-06-10T22:00:00+03:00', '2025-06-11T02:00:00+03:00')]);

    expect(days.map((day) => [day.date, day.blocks[0].startMinute, day.blocks[0].endMinute])).toEqual([
      ['2025-06-10', 22 * 60, 24 * 60],
      ['2025-06-11', 0, 2 * 60],
    ]);
  });

  test('should only include the requested days, including multi-day all-day events', () => {
    const days = buildAgendaDays(
      [{ title: 'Trip', start: '2025-06-09', end: '2025-06-12', allDay: true }, timed('Other day', '2025-06-12T09:00:00+03:00', '2025-06-12T10:00:00+03:00')],
      ['2025-06-11'],
    );

    expect(days).toEqual([{ date: '2025-06-11', allDay: [expect.objectContaining({ title: 'Trip' })], blocks: [] }]);
  });

  test('should ignore events with invalid start values', () => {
    expect(buildAgendaDays([timed('Broken', 'not-a-date', '')])).toEqual([]);
  });
});

describe('generateAgendaImage()', () => {
  test('should return null when there are no events to draw', () => {
    expect(generateAgendaImage([])).toBeNull();
    expect(generateAgendaImage([timed('A', '2025-06-10T09:00:00+03:00', '2025-06-10T10:00:00+03:00')], { days: ['2025-06-11'] })).toBeNull();
  });

  test('should render a png', () => {
    const image = generateAgendaImage([timed('A', '2025-06-10T09:00:00+03:00', '2025-06-10T10:00:00+03:00')], { language: 'he' });

    expect(image.subarray(1, 4).toString()).toEqual('PNG');
  });
});
