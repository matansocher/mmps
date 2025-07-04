import process from 'node:process';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import { provideClient } from './provide-client';

export async function sendSMS(): Promise<MessageInstance> {
  const twilioClient = provideClient();
  const message = await twilioClient.messages.create({
    body: 'Hello from twilio-node',
    to: process.env.MY_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
  });
  return message;
}
