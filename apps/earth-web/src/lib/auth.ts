import { telegramInitData } from './telegram';

// Server calls need a Telegram identity (or a ?devUser= id in local dev); a plain browser visit has none.

function devUserId(): string | null {
  if (import.meta.env.PROD) return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('devUser');
    if (fromQuery) localStorage.setItem('earth:dev-user', fromQuery);
    return fromQuery ?? localStorage.getItem('earth:dev-user');
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> | null {
  const initData = telegramInitData();
  if (initData) return { 'X-Telegram-Init-Data': initData };
  const dev = devUserId();
  return dev ? { 'X-Worldly-Dev-User': dev } : null;
}
