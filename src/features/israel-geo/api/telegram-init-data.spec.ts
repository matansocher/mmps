import crypto from 'node:crypto';
import { verifyIsraelGeoInitData } from './telegram-init-data';

function createInitData(botToken: string, authDate = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'query',
    user: JSON.stringify({ id: 123, username: 'navigator', first_name: 'Matan' }),
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex'));
  return params.toString();
}

describe('verifyIsraelGeoInitData()', () => {
  it('returns the signed Telegram user', () => {
    expect(verifyIsraelGeoInitData(createInitData('secret'), 'secret')).toEqual({
      telegramUserId: 123,
      username: 'navigator',
      firstName: 'Matan',
    });
  });

  it('rejects invalid and expired signatures', () => {
    expect(verifyIsraelGeoInitData(createInitData('secret'), 'wrong')).toEqual(null);
    expect(verifyIsraelGeoInitData(createInitData('secret', Math.floor(Date.now() / 1000) - 90_000), 'secret')).toEqual(null);
  });
});
