import type { CalendarEvent } from '../types';
import { formatEvent } from './format-event';

describe('formatEvent', () => {
  const createMockEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: 'event-123',
    summary: 'Team Meeting',
    description: 'Weekly team sync',
    location: 'Conference Room A',
    start: {
      dateTime: '2025-01-15T10:00:00-05:00',
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: '2025-01-15T11:00:00-05:00',
      timeZone: 'America/New_York',
    },
    status: 'confirmed',
    ...overrides,
  });

  it('should format event with basic information', () => {
    const event = createMockEvent();
    const result = formatEvent(event);

    expect(result.id).toBe('event-123');
    expect(result.title).toBe('Team Meeting');
    expect(result.location).toBe('Conference Room A');
    expect(result.description).toBe('Weekly team sync');
    expect(result.status).toBe('confirmed');
  });

  it('should format date with time for dateTime events', () => {
    const event = createMockEvent();
    const result = formatEvent(event);

    expect(result.date).toContain('Jan');
    expect(result.date).toContain('15');
  });

  it('should include end time in date string for dateTime events', () => {
    const event = createMockEvent();
    const result = formatEvent(event);

    expect(result.date).toContain('-');
  });

  it('should format all-day events correctly', () => {
    const event = createMockEvent({
      start: { date: '2025-01-15' },
      end: { date: '2025-01-16' },
    });
    const result = formatEvent(event);

    expect(result.date).toContain('Jan');
    expect(result.date).toContain('15');
    // All-day events shouldn't have time in format
    expect(result.date).not.toContain(':');
  });

  it('should use "Untitled Event" when summary is missing', () => {
    const event = createMockEvent({ summary: undefined as any });
    const result = formatEvent(event);

    expect(result.title).toBe('Untitled Event');
  });

  it('should use "Untitled Event" for empty string summary (falsy value)', () => {
    const event = createMockEvent({ summary: '' });
    const result = formatEvent(event);

    // Empty string is falsy, so falls back to 'Untitled Event'
    expect(result.title).toBe('Untitled Event');
  });

  it('should handle event without location', () => {
    const event = createMockEvent({ location: undefined });
    const result = formatEvent(event);

    expect(result.location).toBeUndefined();
  });

  it('should handle event without description', () => {
    const event = createMockEvent({ description: undefined });
    const result = formatEvent(event);

    expect(result.description).toBeUndefined();
  });

  it('should handle different event statuses', () => {
    const confirmedEvent = createMockEvent({ status: 'confirmed' });
    const tentativeEvent = createMockEvent({ status: 'tentative' });
    const cancelledEvent = createMockEvent({ status: 'cancelled' });

    expect(formatEvent(confirmedEvent).status).toBe('confirmed');
    expect(formatEvent(tentativeEvent).status).toBe('tentative');
    expect(formatEvent(cancelledEvent).status).toBe('cancelled');
  });

  it('should handle event without id', () => {
    const event = createMockEvent({ id: undefined });
    const result = formatEvent(event);

    expect(result.id).toBeUndefined();
  });

  it('should format multi-day event start date correctly', () => {
    const event = createMockEvent({
      start: { date: '2025-01-15' },
      end: { date: '2025-01-18' },
    });
    const result = formatEvent(event);

    expect(result.date).toContain('Jan');
    expect(result.date).toContain('15');
  });

  it('should handle event with only start time (no end)', () => {
    const event: CalendarEvent = {
      summary: 'Reminder',
      start: {
        dateTime: '2025-01-15T10:00:00-05:00',
      },
      end: {},
    };
    const result = formatEvent(event);

    expect(result.title).toBe('Reminder');
    expect(result.date).toBeDefined();
  });

  it('should format weekend dates correctly', () => {
    const event = createMockEvent({
      start: {
        dateTime: '2025-01-18T14:00:00-05:00', // Saturday
      },
      end: {
        dateTime: '2025-01-18T15:00:00-05:00',
      },
    });
    const result = formatEvent(event);

    expect(result.date).toContain('Sat');
    expect(result.date).toContain('Jan');
    expect(result.date).toContain('18');
  });

  it('should handle early morning events', () => {
    const event = createMockEvent({
      start: {
        dateTime: '2025-01-15T06:30:00-05:00',
      },
      end: {
        dateTime: '2025-01-15T07:00:00-05:00',
      },
    });
    const result = formatEvent(event);

    expect(result.date).toBeDefined();
  });

  it('should handle late night events', () => {
    const event = createMockEvent({
      start: {
        dateTime: '2025-01-15T23:00:00-05:00',
      },
      end: {
        dateTime: '2025-01-16T00:30:00-05:00',
      },
    });
    const result = formatEvent(event);

    expect(result.date).toBeDefined();
  });

  it('should preserve event id for reference', () => {
    const event = createMockEvent({ id: 'unique-event-id-abc123' });
    const result = formatEvent(event);

    expect(result.id).toBe('unique-event-id-abc123');
  });
});
