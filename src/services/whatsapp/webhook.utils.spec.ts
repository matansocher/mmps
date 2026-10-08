import { createHmac } from 'node:crypto';
import type { WhatsAppIncomingMessage, WhatsAppWebhookPayload } from './types';
import { describeFailedStatuses, extractIncomingMessage, isAllowedSender, isValidSignature, parseAllowedPhones } from './webhook.utils';

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

  it('should extract a reply button tap', () => {
    const message = extractIncomingMessage(
      payload({ from: '1', id: 'w5', timestamp: '0', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'more:abc:6', title: 'עוד' } } }),
    );
    expect(message).toEqual({ kind: 'button', from: '1', id: 'w5', buttonId: 'more:abc:6', title: 'עוד' });
  });

  it('should convert the message timestamp to epoch ms', () => {
    const message = extractIncomingMessage(payload({ from: '1', id: 'w4', timestamp: '1700000000', type: 'text', text: { body: 'hi' } }));
    expect(message).toEqual({ kind: 'text', from: '1', id: 'w4', sentAt: 1700000000000, text: 'hi' });
  });

  test.each([
    { name: 'image message', body: payload({ from: '1', id: '1', timestamp: '0', type: 'image' }) },
    { name: 'list reply', body: payload({ from: '1', id: '1', timestamp: '0', type: 'interactive', interactive: { type: 'list_reply' } }) },
    { name: 'status update without messages', body: payload(null) },
    { name: 'empty payload', body: {} as WhatsAppWebhookPayload },
  ])('should return null for $name', ({ body }) => {
    expect(extractIncomingMessage(body)).toEqual(null);
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

describe('parseAllowedPhones()', () => {
  test.each([
    { raw: undefined, expected: [] },
    { raw: '', expected: [] },
    { raw: '972501234567', expected: ['972501234567'] },
    { raw: '+972 50-123-4567, 972511111111 ,,', expected: ['972501234567', '972511111111'] },
  ])('should parse $raw', ({ raw, expected }) => {
    expect([...parseAllowedPhones(raw)]).toEqual(expected);
  });
});

describe('isAllowedSender()', () => {
  it('should allow everyone when the allowlist is empty', () => {
    expect(isAllowedSender('972500000000', new Set())).toEqual(true);
  });

  test.each([
    { from: '972501234567', expected: true },
    { from: '972500000000', expected: false },
  ])('should return $expected for $from', ({ from, expected }) => {
    expect(isAllowedSender(from, new Set(['972501234567']))).toEqual(expected);
  });
});
