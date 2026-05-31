import crypto from 'node:crypto';

const INIT_DATA_MAX_AGE_SEC = 86_400;

export type VerifiedInitData = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly authDate: number;
};

export function verifyChatbotInitData(initData: string, botToken: string): VerifiedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computed.length !== hash.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  const userJson = params.get('user');
  if (!userJson) return null;
  let user: { id?: number; username?: string; first_name?: string };
  try {
    user = JSON.parse(userJson);
  } catch {
    return null;
  }
  if (!user.id) return null;

  return {
    telegramUserId: user.id,
    username: user.username,
    firstName: user.first_name,
    authDate,
  };
}
