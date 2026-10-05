import axios from 'axios';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { WHATSAPP_GRAPH_API_URL } from './constants';
import type { WhatsAppTextMessageRequest } from './types';

const logger = new Logger('whatsapp:api');

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
    await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    const details = axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? err.message) : String(err);
    logger.error(`Failed to send WhatsApp message to ${to}: ${details}`);
  }
}
