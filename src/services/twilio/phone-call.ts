import { env } from 'node:process';
import { provideClient } from './provide-client';

export async function phoneCall(from: string = env.TWILIO_PHONE_NUMBER, to: string = env.MY_PHONE_NUMBER, endpoint: string = 'caller/voice'): Promise<any> {
  const twilioClient = provideClient();
  const callbackUrl = `${env.WEBHOOK_PROXY_URL}/${endpoint}`;
  return twilioClient.calls.create({ url: callbackUrl, from, to });
}
