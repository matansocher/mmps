export type Identity = { readonly userId: number; readonly headers: Readonly<Record<string, string>> };
type TelegramApp = {
  readonly initData?: string;
  readonly ready?: () => void;
  readonly expand?: () => void;
  readonly disableVerticalSwipes?: () => void;
  readonly setHeaderColor?: (color: string) => void;
  readonly setBackgroundColor?: (color: string) => void;
};
type TelegramWindow = Window & { readonly Telegram?: { readonly WebApp?: TelegramApp } };

export function telegramIdentity(initData: string): Identity | null {
  if (!initData) return null;
  const value: unknown = JSON.parse(new URLSearchParams(initData).get('user') ?? 'null');
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id < 1)
    throw new Error('Telegram did not provide a player identity');
  // This ID only selects a local cache. The server independently verifies the signed payload.
  return { userId: value.id, headers: { 'X-Telegram-Init-Data': initData } };
}

export function initializeIdentity(): Identity | null {
  const app = (window as TelegramWindow).Telegram?.WebApp;
  app?.ready?.();
  app?.expand?.();
  app?.disableVerticalSwipes?.();
  app?.setHeaderColor?.('#e2e8df');
  app?.setBackgroundColor?.('#e2e8df');
  const initData = app?.initData || new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData') || '';
  if (initData) {
    const identity = telegramIdentity(initData);
    window.sessionStorage.setItem('rewind.telegram.initData', initData);
    return identity;
  }
  if (import.meta.env.DEV) {
    const userId = Number(new URLSearchParams(window.location.search).get('devUser'));
    if (Number.isSafeInteger(userId) && userId > 0) return { userId, headers: { 'X-Rewind-Dev-User': String(userId) } };
  }
  const sessionIdentity = window.sessionStorage.getItem('rewind.telegram.initData');
  if (sessionIdentity) return telegramIdentity(sessionIdentity);
  return null;
}
