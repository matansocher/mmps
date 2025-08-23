import { env } from 'node:process';
import client, { Twilio } from 'twilio';

export function provideClient(): Twilio {
  return client(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}
