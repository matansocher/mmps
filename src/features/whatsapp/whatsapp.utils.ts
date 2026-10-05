import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, WhatsAppWebhookPayload } from './types';

export function extractIncomingMessage(payload: WhatsAppWebhookPayload): IncomingMessage | null {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message?.from) return null;
  if (message.type === 'text' && message.text?.body) {
    return { kind: 'text', from: message.from, id: message.id, text: message.text.body, ...(message.context?.id && { contextId: message.context.id }) };
  }
  if (message.type === 'sticker' && message.sticker?.id) {
    return { kind: 'sticker', from: message.from, id: message.id, mediaId: message.sticker.id, animated: Boolean(message.sticker.animated) };
  }
  return null;
}

// Lowercased, de-duplicated words in any script (Hebrew, English, digits), e.g. "Funny, CAT!! #lol" -> ["funny", "cat", "lol"]
export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return [...new Set(words)];
}

// Header format: "sha256=<hex hmac of the raw request body, keyed with the app secret>"
export function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const received = Buffer.from(signatureHeader.slice('sha256='.length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// One-line summary of a webhook event for logs, e.g. "object=whatsapp_business_account field=messages messages=[text] statuses=[]"
export function describePayload(payload: WhatsAppWebhookPayload): string {
  const changes = (payload?.entry ?? []).flatMap((entry) => entry.changes ?? []);
  const fields = changes.map((change) => change.field).join(',');
  const messages = changes.flatMap((change) => change.value?.messages ?? []).map((message) => message.type);
  const statuses = changes.flatMap((change) => change.value?.statuses ?? []).map((status) => status.status);
  return `object=${payload?.object} field=${fields} messages=[${messages.join(',')}] statuses=[${statuses.join(',')}]`;
}

// One line per failed delivery, e.g. "wamid.X to 972501234567: 131053 Media upload error - Sticker file too large"
export function describeFailedStatuses(payload: WhatsAppWebhookPayload): string[] {
  const statuses = (payload?.entry ?? []).flatMap((entry) => entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []);
  return statuses
    .filter((status) => status.status === 'failed')
    .map((status) => {
      const errors = (status.errors ?? []).map((error) => [error.code, error.title, error.error_data?.details && `- ${error.error_data.details}`].filter(Boolean).join(' '));
      return `${status.id} to ${status.recipient_id}: ${errors.join('; ') || 'no error details'}`;
    });
}
