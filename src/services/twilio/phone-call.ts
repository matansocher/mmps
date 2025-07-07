import * as process from 'node:process';
import { provideClient } from './provide-client';

export async function phoneCall(from: string = process.env.TWILIO_PHONE_NUMBER, to: string = process.env.MY_PHONE_NUMBER) {
  const twilioClient = provideClient();
  const callbackUrl = `${process.env.WEBHOOK_PROXY_URL}/caller/voice`;
  return twilioClient.calls.create({ url: callbackUrl, from, to });
}
