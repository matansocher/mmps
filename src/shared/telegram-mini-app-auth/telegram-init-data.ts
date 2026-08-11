import crypto from 'node:crypto';

const INIT_DATA_MAX_AGE_SEC = 86_400;
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

type TelegramInitDataUser = {
  readonly id?: unknown;
  readonly username?: unknown;
  readonly first_name?: unknown;
  readonly last_name?: unknown;
};

export type VerifiedTelegramInitData = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly authDate: number;
};

export function verifyTelegramInitData(initData: string, botToken: string): VerifiedTelegramInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !SHA_256_HEX_PATTERN.test(hash)) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
  const providedHash = Buffer.from(hash, 'hex');
  if (!crypto.timingSafeEqual(computedHash, providedHash)) return null;

  const authDate = Number(params.get('auth_date'));
  const currentTime = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(authDate) || authDate <= 0 || authDate > currentTime || currentTime - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  const userJson = params.get('user');
  if (!userJson) return null;

  let user: TelegramInitDataUser;
  try {
    user = JSON.parse(userJson);
  } catch {
    return null;
  }

  if (!Number.isInteger(user.id) || Number(user.id) <= 0) return null;

  return {
    telegramUserId: Number(user.id),
    username: typeof user.username === 'string' ? user.username : undefined,
    firstName: typeof user.first_name === 'string' ? user.first_name : undefined,
    lastName: typeof user.last_name === 'string' ? user.last_name : undefined,
    authDate,
  };
}
