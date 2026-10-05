import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingTextMessage, WhatsAppWebhookPayload } from './types';

export function extractTextMessage(payload: WhatsAppWebhookPayload): IncomingTextMessage | null {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== 'text' || !message.text?.body) return null;
  return { from: message.from, text: message.text.body };
}

// Header format: "sha256=<hex hmac of the raw request body, keyed with the app secret>"
export function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const received = Buffer.from(signatureHeader.slice('sha256='.length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function buildReply(text: string): string {
  return `You said: ${text}`;
}
