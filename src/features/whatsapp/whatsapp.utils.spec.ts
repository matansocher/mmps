import { createHmac } from 'node:crypto';
import type { WhatsAppIncomingMessage, WhatsAppWebhookPayload } from './types';
import { extractIncomingMessage, isValidSignature, tokenize } from './whatsapp.utils';

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
