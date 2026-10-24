import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { fetchEmailFull, listMessageIds } from '@services/gmail';
import { listEvents } from '@services/google-calendar';
import { getResponse } from '@services/openai';
import type { ChatbotService } from '../chatbot.service';
import { getScannedEmailIds, saveEmailEvents, setEmailEventMessageId } from '../email-events';
import { emailEventSuggest, toEventDetails } from './email-event-suggest';

vi.mock('@services/gmail', () => ({ fetchEmailFull: vi.fn(), listMessageIds: vi.fn() }));
vi.mock('@services/google-calendar', () => ({ listEvents: vi.fn() }));
vi.mock('@services/openai', () => ({ getResponse: vi.fn() }));
vi.mock('../email-events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../email-events')>()),
  getScannedEmailIds: vi.fn(),
  saveEmailEvents: vi.fn(),
  setEmailEventMessageId: vi.fn(),
}));

const NOW = new Date('2026-05-10T09:00:00Z');
const sendMessage = vi.fn();
const bot = { api: { sendMessage } } as unknown as Bot;
const chatbotService = { recordProactiveMessage: vi.fn() } as unknown as ChatbotService;

function email(id: string) {
  return { id, from: `sender-${id}@example.com`, subject: `Subject ${id}`, date: 'Sun, 10 May 2026 08:00:00 +0300', snippet: '', bodyText: `Body ${id}`, attachments: [] };
}

function noEvent(id: string) {
  return { id, isEvent: false, title: null, date: null, startTime: null, endDate: null, endTime: null, location: null, description: null };
}

function event(id: string, overrides: Record<string, unknown> = {}) {
  return { ...noEvent(id), isEvent: true, title: `Event ${id}`, date: '2026-05-12', startTime: '18:00', location: 'Tel Aviv', ...overrides };
}

describe('toEventDetails()', () => {
  it('should return null for non-events, malformed dates and past events', () => {
    expect(toEventDetails(noEvent('a'), NOW)).toEqual(null);
    expect(toEventDetails(event('a', { date: '12/05/2026' }), NOW)).toEqual(null);
    expect(toEventDetails(event('a', { date: '2026-05-09' }), NOW)).toEqual(null);
  });

  it('should keep a multi-day event that started in the past but ends in the future', () => {
    expect(toEventDetails(event('a', { date: '2026-05-08', endDate: '2026-05-11', startTime: null }), NOW)?.endDate).toEqual('2026-05-11');
  });

  it('should drop invalid times and an end time without a start time', () => {
    expect(toEventDetails(event('a', { startTime: '25:00', endTime: '20:00' }), NOW)).toEqual({
      title: 'Event a',
      date: '2026-05-12',
      startTime: null,
      endDate: null,
      endTime: null,
      location: 'Tel Aviv',
      description: null,
    });
  });
});

describe('emailEventSuggest()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(getScannedEmailIds).mockResolvedValue(new Set());
    vi.mocked(fetchEmailFull).mockImplementation(async (id) => email(id));
    vi.mocked(listEvents).mockResolvedValue([]);
    vi.mocked(saveEmailEvents).mockImplementation(async (records) => new Map(records.map((r, i) => [r.emailId, `id${i}`])));
    sendMessage.mockResolvedValue({ message_id: 42 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should skip already-scanned emails and suggest only new upcoming events with add/dismiss buttons', async () => {
    vi.mocked(listMessageIds).mockResolvedValue(['a', 'b', 'c']);
    vi.mocked(getScannedEmailIds).mockResolvedValue(new Set(['a']));
    vi.mocked(getResponse).mockResolvedValue({ id: 'r', result: { results: [noEvent('c'), event('b')] } });

    await emailEventSuggest(bot, chatbotService);

    expect(fetchEmailFull).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveEmailEvents).mock.calls[0][0].map((r) => [r.emailId, r.status])).toEqual([
      ['b', 'pending'],
      ['c', 'none'],
    ]);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text, options] = sendMessage.mock.calls[0];
    expect(chatId).toEqual(MY_USER_ID);
    expect(text).toContain('Event b');
    expect(options.reply_markup.inline_keyboard[0].map((b) => b.callback_data)).toEqual(['emailevent:add:id0', 'emailevent:dismiss:id0']);
    expect(setEmailEventMessageId).toHaveBeenCalledWith('id0', 42);
    expect(chatbotService.recordProactiveMessage).toHaveBeenCalledWith(MY_USER_ID, text, 'email-event-suggest');
  });

  it('should not suggest an event that is already on the calendar', async () => {
    vi.mocked(listMessageIds).mockResolvedValue(['a']);
    vi.mocked(getResponse).mockResolvedValue({ id: 'r', result: { results: [event('a')] } });
    vi.mocked(listEvents).mockResolvedValue([{ summary: 'event a' }]);

    await emailEventSuggest(bot, chatbotService);

    expect(vi.mocked(saveEmailEvents).mock.calls[0][0][0].status).toEqual('none');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should not save emails from a failed batch so they are retried next run', async () => {
    vi.mocked(listMessageIds).mockResolvedValue(['a']);
    vi.mocked(getResponse).mockResolvedValue({ id: 'r', result: { results: [event('unknown')] } });

    await emailEventSuggest(bot, chatbotService);

    expect(vi.mocked(saveEmailEvents).mock.calls[0][0]).toEqual([]);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
