type TelegramApp = {
  readonly initData?: string;
  readonly colorScheme?: string;
  readonly initDataUnsafe?: { readonly start_param?: string };
  readonly contentSafeAreaInset?: { readonly top: number; readonly bottom: number };
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  onEvent?: (name: string, handler: () => void) => void;
  offEvent?: (name: string, handler: () => void) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (handler: () => void) => void; offClick: (handler: () => void) => void };
  HapticFeedback?: { notificationOccurred: (type: 'success' | 'error' | 'warning') => void };
  requestWriteAccess?: (callback: (allowed: boolean) => void) => void;
  addToHomeScreen?: () => void;
};
export function telegram(): TelegramApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramApp } }).Telegram?.WebApp;
}
export function initializeTelegram(): () => void {
  const tg = telegram();
  tg?.ready?.();
  tg?.expand?.();
  const update = () => {
    document.documentElement.style.setProperty('--tg-top', `${tg?.contentSafeAreaInset?.top ?? 0}px`);
    document.documentElement.style.setProperty('--tg-bottom', `${tg?.contentSafeAreaInset?.bottom ?? 0}px`);
  };
  update();
  tg?.onEvent?.('contentSafeAreaChanged', update);
  return () => tg?.offEvent?.('contentSafeAreaChanged', update);
}
