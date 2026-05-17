import crypto from 'node:crypto';
import { verifyInitData } from './telegram-init-data';

const BOT_TOKEN = '123456:test-token';

function signInitData(params: Record<string, string>, token: string): string {
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

describe('verifyInitData()', () => {
  it('verifies a valid payload', () => {
    const initData = signInitData(
      {
        user: JSON.stringify({ id: 12345, username: 'testuser', first_name: 'Test' }),
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: 'AAH123',
      },
      BOT_TOKEN,
    );
    const result = verifyInitData(initData, BOT_TOKEN);
    expect(result).toMatchObject({ telegramUserId: 12345, username: 'testuser', firstName: 'Test' });
  });

  it('rejects a tampered payload', () => {
    const valid = signInitData(
      { user: JSON.stringify({ id: 12345 }), auth_date: String(Math.floor(Date.now() / 1000)) },
      BOT_TOKEN,
    );
    const tampered = valid.replace('12345', '99999');
    expect(verifyInitData(tampered, BOT_TOKEN)).toBeNull();
  });

  it('rejects payload signed with wrong token', () => {
    const initData = signInitData(
      { user: JSON.stringify({ id: 12345 }), auth_date: String(Math.floor(Date.now() / 1000)) },
      'wrong:token',
    );
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects payload older than 24h', () => {
    const oldDate = Math.floor(Date.now() / 1000) - 86_500;
    const initData = signInitData(
      { user: JSON.stringify({ id: 12345 }), auth_date: String(oldDate) },
      BOT_TOKEN,
    );
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects payload missing hash', () => {
    expect(verifyInitData('user=abc&auth_date=123', BOT_TOKEN)).toBeNull();
  });

  it('rejects payload missing user', () => {
    const initData = signInitData(
      { auth_date: String(Math.floor(Date.now() / 1000)) },
      BOT_TOKEN,
    );
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });
});
