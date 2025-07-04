import client, { Twilio } from 'twilio';

export function provideClient(): Twilio {
  return client(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}
