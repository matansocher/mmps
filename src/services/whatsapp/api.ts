import axios from 'axios';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { WHATSAPP_GRAPH_API_URL } from './constants';
import type { WhatsAppMediaInfo, WhatsAppSendMessageResponse, WhatsAppStickerMessageRequest, WhatsAppTextMessageRequest } from './types';

const logger = new Logger('whatsapp:api');

const authHeaders = () => ({ Authorization: `Bearer ${env.WHATSAPP_TOKEN}` });

export function describeWhatsAppError(err: unknown): string {
  return axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? err.message) : String(err);
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const url = `${WHATSAPP_GRAPH_API_URL}/${env.PHONE_NUMBER_ID}/messages`;
  const body: WhatsAppTextMessageRequest = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  };
  try {
    const response = await axios.post<WhatsAppSendMessageResponse>(url, body, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    logger.log(`Sent WhatsApp message to ${to} (id=${response.data?.messages?.[0]?.id})`);
  } catch (err) {
    logger.error(`Failed to send WhatsApp message to ${to}: ${describeWhatsAppError(err)}`);
  }
}

// Returns the sent message id (wamid). Throws on failure so callers can retry with a fresh upload.
export async function sendWhatsAppSticker(to: string, mediaId: string): Promise<string | null> {
  const url = `${WHATSAPP_GRAPH_API_URL}/${env.PHONE_NUMBER_ID}/messages`;
  const body: WhatsAppStickerMessageRequest = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'sticker',
    sticker: { id: mediaId },
  };
  const response = await axios.post<WhatsAppSendMessageResponse>(url, body, {
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  const messageId = response.data?.messages?.[0]?.id ?? null;
  logger.log(`Sent WhatsApp sticker to ${to} (id=${messageId})`);
  return messageId;
}

// Media urls returned by Meta are short-lived (~5 min) and need the bearer token, so download right away.
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ readonly data: Buffer; readonly mimeType: string }> {
  const { data: info } = await axios.get<WhatsAppMediaInfo>(`${WHATSAPP_GRAPH_API_URL}/${mediaId}`, { headers: authHeaders() });
  const { data } = await axios.get<ArrayBuffer>(info.url, { headers: authHeaders(), responseType: 'arraybuffer' });
  return { data: Buffer.from(data), mimeType: info.mime_type };
}

// Uploaded media stays valid for 30 days; returns the media id to send with.
export async function uploadWhatsAppMedia(data: Buffer, mimeType: string, filename: string): Promise<string> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([new Uint8Array(data)], { type: mimeType }), filename);
  const response = await axios.post<{ readonly id: string }>(`${WHATSAPP_GRAPH_API_URL}/${env.PHONE_NUMBER_ID}/media`, form, { headers: authHeaders() });
  return response.data.id;
}
