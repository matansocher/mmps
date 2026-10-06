import { createHmac } from 'node:crypto';
import type { WhatsAppIncomingMessage, WhatsAppWebhookPayload } from './types';
import { createStepTimer, describeFailedStatuses, extractIncomingMessage, isValidSignature, parseTagEdits, tokenize } from './whatsapp.utils';

describe('extractIncomingMessage()', () => {
  const payload = (message: WhatsAppIncomingMessage | null): WhatsAppWebhookPayload => ({ entry: [{ changes: [{ value: { messages: message ? [message] : undefined } }] }] });

  it('should extract a text message', () => {
    expect(extractIncomingMessage(payload({ from: '972500000000', id: 'w1', timestamp: '0', type: 'text', text: { body: 'hi' } }))).toEqual({
      kind: 'text',
      from: '972500000000',
      id: 'w1',
      text: 'hi',
    });
  });

  it('should include the quoted message id of a reply', () => {
    const message = extractIncomingMessage(payload({ from: '1', id: 'w2', timestamp: '0', type: 'text', text: { body: 'cat' }, context: { id: 'w1' } }));
    expect(message).toEqual({ kind: 'text', from: '1', id: 'w2', text: 'cat', contextId: 'w1' });
  });

  it('should extract a sticker message', () => {
    const message = extractIncomingMessage(payload({ from: '1', id: 'w3', timestamp: '0', type: 'sticker', sticker: { id: 'm1', animated: true } }));
    expect(message).toEqual({ kind: 'sticker', from: '1', id: 'w3', mediaId: 'm1', animated: true });
  });

  it('should convert the message timestamp to epoch ms', () => {
    const message = extractIncomingMessage(payload({ from: '1', id: 'w4', timestamp: '1700000000', type: 'text', text: { body: 'hi' } }));
    expect(message).toEqual({ kind: 'text', from: '1', id: 'w4', sentAt: 1700000000000, text: 'hi' });
  });

  test.each([
    { name: 'image message', body: payload({ from: '1', id: '1', timestamp: '0', type: 'image' }) },
    { name: 'status update without messages', body: payload(null) },
    { name: 'empty payload', body: {} as WhatsAppWebhookPayload },
  ])('should return null for $name', ({ body }) => {
    expect(extractIncomingMessage(body)).toEqual(null);
  });
});

describe('tokenize()', () => {
  test.each([
    { text: 'Happy  Cat!', expected: ['happy', 'cat'] },
    { text: 'חתול שמח, חתול', expected: ['חתול', 'שמח'] },
    { text: 'lol 100%', expected: ['lol', '100'] },
    { text: '  ?! ', expected: [] },
  ])('should tokenize "$text"', ({ text, expected }) => {
    expect(tokenize(text)).toEqual(expected);
  });
});

describe('isValidSignature()', () => {
  const secret = 'app-secret';
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const sign = (buf: Buffer) => `sha256=${createHmac('sha256', secret).update(buf).digest('hex')}`;

  it('should accept a correct signature', () => {
    expect(isValidSignature(body, sign(body), secret)).toEqual(true);
  });

  test.each([
    { name: 'missing header', header: undefined },
    { name: 'wrong prefix', header: 'sha1=abc' },
    { name: 'tampered body', header: sign(Buffer.from('{}')) },
    { name: 'truncated signature', header: sign(body).slice(0, 20) },
  ])('should reject $name', ({ header }) => {
    expect(isValidSignature(body, header, secret)).toEqual(false);
  });
});

describe('describeFailedStatuses()', () => {
  const payload = (statuses: unknown[]): WhatsAppWebhookPayload => ({ entry: [{ changes: [{ field: 'messages', value: { statuses } }] }] }) as WhatsAppWebhookPayload;

  it('should describe failed deliveries with their errors', () => {
    const failed = { id: 'wamid.x', status: 'failed', recipient_id: '972', errors: [{ code: 131053, title: 'Media upload error', error_data: { details: 'too large' } }] };
    expect(describeFailedStatuses(payload([failed, { id: 'wamid.y', status: 'delivered' }]))).toEqual(['wamid.x to 972: 131053 Media upload error - too large']);
  });

  it('should handle failures without error details', () => {
    expect(describeFailedStatuses(payload([{ id: 'wamid.x', status: 'failed', recipient_id: '972' }]))).toEqual(['wamid.x to 972: no error details']);
  });

  it('should return nothing for message events', () => {
    expect(describeFailedStatuses({ entry: [{ changes: [{ value: { messages: [] } }] }] } as WhatsAppWebhookPayload)).toEqual([]);
  });
});

describe('parseTagEdits()', () => {
  test.each([
    { text: 'Happy cat', expected: { add: ['happy', 'cat'], remove: [] } },
    { text: 'טוב -לילה', expected: { add: ['טוב'], remove: ['לילה'] } },
    { text: 'לילה- Cat', expected: { add: ['cat'], remove: ['לילה'] } },
    { text: '-cat cat', expected: { add: [], remove: ['cat'] } },
    { text: '-', expected: { add: [], remove: [] } },
    { text: '  dog,  -dog-  ', expected: { add: [], remove: ['dog'] } },
  ])('should parse "$text"', ({ text, expected }) => {
    expect(parseTagEdits(text)).toEqual(expected);
  });
});

describe('createStepTimer()', () => {
  it('should list each step duration in order, then the total', async () => {
    const ticks = [0, 10, 25, 30, 100, 120];
    const timer = createStepTimer(() => ticks.shift());
    await timer.time('search', async () => 'x');
    await timer.time('send', async () => 'y');
    expect(timer.summary()).toEqual('search=15ms send=70ms total=120ms');
  });

  it('should record a step that throws and rethrow', async () => {
    const ticks = [0, 0, 5, 9];
    const timer = createStepTimer(() => ticks.shift());
    await expect(timer.time('upload', async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(timer.summary()).toEqual('upload=5ms total=9ms');
  });
});
