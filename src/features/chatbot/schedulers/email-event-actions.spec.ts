import { buildEmailEventCallbackData, parseEmailEventCallbackData } from './email-event-actions';

describe('parseEmailEventCallbackData()', () => {
  test.each([
    { data: buildEmailEventCallbackData('add', '0123456789abcdef01234567'), expected: { action: 'add', emailEventId: '0123456789abcdef01234567' } },
    { data: buildEmailEventCallbackData('dismiss', 'abc'), expected: { action: 'dismiss', emailEventId: 'abc' } },
    { data: 'emailevent:snooze:abc', expected: null },
    { data: 'emailevent:add', expected: null },
    { data: 'reminder:done:abc', expected: null },
  ])('should parse $data', ({ data, expected }) => {
    expect(parseEmailEventCallbackData(data)).toEqual(expected);
  });
});
