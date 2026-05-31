import crypto from 'node:crypto';
import { verifyCoachInitData } from './telegram-init-data';

function makeInitData(botToken: string, user: { id: number; username?: string }, authDate = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('user', JSON.stringify(user));
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('verifyCoachInitData()', () => {
  const botToken = 'test-bot-token';

  it('returns parsed user for a valid signature', () => {
    const initData = makeInitData(botToken, { id: 12345, username: 'guz' });
    const result = verifyCoachInitData(initData, botToken);
    expect(result).toEqual({
      telegramUserId: 12345,
      username: 'guz',
      firstName: undefined,
      authDate: expect.any(Number),
    });
  });

  it('returns null for tampered hash', () => {
    const initData = makeInitData(botToken, { id: 12345 });
    const tampered = initData.replace(/hash=[a-f0-9]+/, 'hash=' + '0'.repeat(64));
    expect(verifyCoachInitData(tampered, botToken)).toBeNull();
  });

  it('returns null for missing hash', () => {
    expect(verifyCoachInitData('auth_date=1&user=%7B%22id%22%3A1%7D', botToken)).toBeNull();
  });

  it('returns null for expired auth_date', () => {
    const oneWeekAgo = Math.floor(Date.now() / 1000) - 86_400 * 7;
    const initData = makeInitData(botToken, { id: 1 }, oneWeekAgo);
    expect(verifyCoachInitData(initData, botToken)).toBeNull();
  });

  it('returns null for malformed user json', () => {
    const params = new URLSearchParams();
    params.set('auth_date', String(Math.floor(Date.now() / 1000)));
    params.set('user', '{not-json');
    params.set('hash', 'whatever');
    expect(verifyCoachInitData(params.toString(), botToken)).toBeNull();
  });
});
