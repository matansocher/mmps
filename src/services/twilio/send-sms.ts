import process from 'node:process';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import { provideClient } from './provide-client';

export function sendSMS(body: string, from: string = process.env.TWILIO_PHONE_NUMBER, to: string = process.env.MY_PHONE_NUMBER): Promise<MessageInstance> {
  const twilioClient = provideClient();
  return twilioClient.messages.create({ body, from, to });
}
