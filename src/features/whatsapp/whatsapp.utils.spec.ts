import { createHmac } from 'node:crypto';
import type { WhatsAppIncomingMessage, WhatsAppWebhookPayload } from './types';
import { extractTextMessage, isValidSignature } from './whatsapp.utils';

describe('extractTextMessage()', () => {
  const payload = (message: WhatsAppIncomingMessage | null): WhatsAppWebhookPayload => ({ entry: [{ changes: [{ value: { messages: message ? [message] : undefined } }] }] });

  it('should return sender and text for a text message', () => {
    expect(extractTextMessage(payload({ from: '972500000000', id: '1', timestamp: '0', type: 'text', text: { body: 'hi' } }))).toEqual({ from: '972500000000', text: 'hi' });
  });

  test.each([
    { name: 'non-text message', body: payload({ from: '1', id: '1', timestamp: '0', type: 'image' }) },
    { name: 'status update without messages', body: payload(null) },
    { name: 'empty payload', body: {} as WhatsAppWebhookPayload },
  ])('should return null for $name', ({ body }) => {
    expect(extractTextMessage(body)).toEqual(null);
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
