type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

const APP_BACKGROUND = '#070b14';

export function initializeTelegram(): void {
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  if (!tg) return;
  tg.ready?.();
  tg.expand?.();
  // Dragging the globe down would otherwise collapse/close the mini app.
  tg.disableVerticalSwipes?.();
  tg.setHeaderColor?.(APP_BACKGROUND);
  tg.setBackgroundColor?.(APP_BACKGROUND);
}
