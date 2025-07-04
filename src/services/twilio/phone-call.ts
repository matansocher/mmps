import * as process from 'node:process';
import { provideClient } from './provide-client';

export async function phoneCall() {
  const twilioClient = provideClient();
  const res = await twilioClient.calls.create({
    url: `${process.env.WEBHOOK_PROXY_URL}/caller/voice`,
    to: process.env.MY_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
  });
  return res;
}
