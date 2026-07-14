import crypto from 'node:crypto';
import type { IsraelGeoRequestUser } from '../types';

const INIT_DATA_MAX_AGE_SECONDS = 86_400;

export function verifyIsraelGeoInitData(initData: string, botToken: string): IsraelGeoRequestUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (computed.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get('user') ?? '') as { id?: number; username?: string; first_name?: string };
    if (!user.id) return null;
    return { telegramUserId: user.id, username: user.username, firstName: user.first_name };
  } catch {
    return null;
  }
}
