type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

const APP_BACKGROUND = '#070b14';

const telegramWebApp = (): TelegramWebApp | undefined => (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;

// Signed Telegram user data; empty when the page is opened outside Telegram.
export const telegramInitData = (): string => telegramWebApp()?.initData ?? '';

export function initializeTelegram(): void {
  const tg = telegramWebApp();
  if (!tg) return;
  tg.ready?.();
  tg.expand?.();
  // Dragging the globe down would otherwise collapse/close the mini app.
  tg.disableVerticalSwipes?.();
  tg.setHeaderColor?.(APP_BACKGROUND);
  tg.setBackgroundColor?.(APP_BACKGROUND);
}
