import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, WhatsAppWebhookPayload } from './types';

export function extractIncomingMessage(payload: WhatsAppWebhookPayload): IncomingMessage | null {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message?.from) return null;
  const sentAt = Number(message.timestamp) * 1000;
  const base = { from: message.from, id: message.id, ...(sentAt > 0 && { sentAt }) };
  if (message.type === 'text' && message.text?.body) {
    return { kind: 'text', ...base, text: message.text.body, ...(message.context?.id && { contextId: message.context.id }) };
  }
  if (message.type === 'sticker' && message.sticker?.id) {
    return { kind: 'sticker', ...base, mediaId: message.sticker.id, animated: Boolean(message.sticker.animated) };
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

export type TagEdits = {
  readonly add: string[];
  readonly remove: string[];
};

// Words with a leading or trailing "-" remove a tag, e.g. "cat -dog night-" -> { add: ["cat"], remove: ["dog", "night"] }
export function parseTagEdits(text: string): TagEdits {
  const add = new Set<string>();
  const remove = new Set<string>();
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const target = word.startsWith('-') || word.endsWith('-') ? remove : add;
    tokenize(word).forEach((tag) => target.add(tag));
  }
  return { add: [...add].filter((tag) => !remove.has(tag)), remove: [...remove] };
}

export type StepTimer = {
  readonly time: <T>(step: string, run: () => Promise<T>) => Promise<T>;
  readonly elapsedMs: () => number;
  readonly summary: () => string;
};

// Records how long each awaited step took, in order, e.g. "search=42ms upload=812ms send=391ms total=1250ms"
export function createStepTimer(now: () => number = Date.now): StepTimer {
  const startedAt = now();
  const steps: string[] = [];
  return {
    time: async (step, run) => {
      const stepStartedAt = now();
      try {
        return await run();
      } finally {
        steps.push(`${step}=${now() - stepStartedAt}ms`);
      }
    },
    elapsedMs: () => now() - startedAt,
    summary: () => [...steps, `total=${now() - startedAt}ms`].join(' '),
  };
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
