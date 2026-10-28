import axios, { AxiosError } from 'axios';
import { env } from 'node:process';
import { isWhatsAppPairRateLimitError, isWhatsAppReEngagementError, sendWhatsAppButtons, sendWhatsAppTemplate, sendWhatsAppTypingIndicator } from './api';
import { WHATSAPP_GRAPH_API_URL } from './constants';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, post: vi.fn(), isAxiosError: actual.default.isAxiosError } };
});

const apiError = (code: number) => new AxiosError('failed', '400', undefined, undefined, { data: { error: { code } }, status: 400, statusText: 'Bad Request', headers: {}, config: {} as never });

describe('sendWhatsAppTypingIndicator()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.PHONE_NUMBER_ID = '123';
  });

  it('should mark the message read and show the typing indicator', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });
    await sendWhatsAppTypingIndicator('wamid.in');
    expect(axios.post).toHaveBeenCalledWith(
      `${WHATSAPP_GRAPH_API_URL}/123/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.in', typing_indicator: { type: 'text' } },
      { headers: expect.objectContaining({ 'Content-Type': 'application/json' }) },
    );
  });

  it('should swallow errors', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(apiError(100));
    await expect(sendWhatsAppTypingIndicator('wamid.in')).resolves.toBeUndefined();
  });
});

describe('sendWhatsAppButtons()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.PHONE_NUMBER_ID = '123';
  });

  it('should send an interactive message with reply buttons', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.out' }] } });
    await sendWhatsAppButtons('972', 'יש עוד 2 סטיקרים.', [{ id: 'more:abc:6', title: 'עוד' }]);
    expect(axios.post).toHaveBeenCalledWith(
      `${WHATSAPP_GRAPH_API_URL}/123/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '972',
        type: 'interactive',
        interactive: { type: 'button', body: { text: 'יש עוד 2 סטיקרים.' }, action: { buttons: [{ type: 'reply', reply: { id: 'more:abc:6', title: 'עוד' } }] } },
      },
      { headers: expect.objectContaining({ 'Content-Type': 'application/json' }) },
    );
  });

  it('should swallow errors', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(apiError(100));
    await expect(sendWhatsAppButtons('972', 'hi', [{ id: 'x', title: 'x' }])).resolves.toBeUndefined();
  });
});

describe('isWhatsAppPairRateLimitError()', () => {
  test.each([
    { name: 'pair rate limit error', err: apiError(131056), expected: true },
    { name: 'other API error', err: apiError(131026), expected: false },
    { name: 'plain error', err: new Error('boom'), expected: false },
  ])('should return $expected for $name', ({ err, expected }) => {
    expect(isWhatsAppPairRateLimitError(err)).toEqual(expected);
  });
});

describe('isWhatsAppReEngagementError()', () => {
  test.each([
    { name: 're-engagement error', err: apiError(131047), expected: true },
    { name: 'other API error', err: apiError(131056), expected: false },
    { name: 'plain error', err: new Error('boom'), expected: false },
  ])('should return $expected for $name', ({ err, expected }) => {
    expect(isWhatsAppReEngagementError(err)).toEqual(expected);
  });
});

describe('sendWhatsAppTemplate()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.PHONE_NUMBER_ID = '123';
  });

  it('should send a template with quick-reply payloads', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.out' }] } });
    await expect(sendWhatsAppTemplate('972', 'new_sticker', 'he', { bodyParams: ['מתן'], quickReplyPayloads: ['show:abc'] })).resolves.toEqual('wamid.out');
    expect(axios.post).toHaveBeenCalledWith(
      `${WHATSAPP_GRAPH_API_URL}/123/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '972',
        type: 'template',
        template: {
          name: 'new_sticker',
          language: { code: 'he' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: 'מתן' }] },
            { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'show:abc' }] },
          ],
        },
      },
      { headers: expect.objectContaining({ 'Content-Type': 'application/json' }) },
    );
  });

  it('should omit components when there are no parameters', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.out' }] } });
    await sendWhatsAppTemplate('972', 'new_sticker', 'he');
    expect(vi.mocked(axios.post).mock.calls[0][1]).toEqual(expect.objectContaining({ template: { name: 'new_sticker', language: { code: 'he' } } }));
  });

  it('should throw on failure', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(apiError(132001));
    await expect(sendWhatsAppTemplate('972', 'new_sticker', 'he')).rejects.toThrow();
  });
});
