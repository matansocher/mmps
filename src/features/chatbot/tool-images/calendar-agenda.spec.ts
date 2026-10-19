import type { ToolResult } from '../types';
import { buildCalendarAgendaImage, selectCalendarEvents } from './calendar-agenda';

const event = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Event ${id}`,
  date: 'ignored',
  start: '2025-06-10T09:00:00+03:00',
  end: '2025-06-10T10:00:00+03:00',
  allDay: false,
  location: null,
  ...overrides,
});

describe('selectCalendarEvents()', () => {
  test('should merge list results, skip single-event results and de-duplicate by id', () => {
    const results: ToolResult[] = [
      { toolName: 'calendar', data: { message: 'Found 2 events', events: [event('1'), event('2', { allDay: true, start: '2025-06-10', end: '2025-06-11', location: 'Home' })] } },
      { toolName: 'calendar', data: { message: 'Event created', event: event('3') } },
      { toolName: 'calendar', data: { events: [event('1'), event('4', { start: undefined })] } },
      { toolName: 'weather', data: { events: [event('5')] } },
    ];

    expect(selectCalendarEvents(results)).toEqual([
      { title: 'Event 1', start: '2025-06-10T09:00:00+03:00', end: '2025-06-10T10:00:00+03:00', allDay: false, location: undefined },
      { title: 'Event 2', start: '2025-06-10', end: '2025-06-11', allDay: true, location: 'Home' },
    ]);
  });
});

describe('buildCalendarAgendaImage()', () => {
  test('should return null when no events were listed', () => {
    expect(buildCalendarAgendaImage([{ toolName: 'calendar', data: { message: 'No events found', events: [] } }], 'No events')).toBeNull();
  });

  test('should render a png for listed events', () => {
    const image = buildCalendarAgendaImage([{ toolName: 'calendar', data: { events: [event('1')] } }], 'You have one meeting tomorrow');

    expect(image.subarray(1, 4).toString()).toEqual('PNG');
  });
});
