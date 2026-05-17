type ThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  initData: string;
  themeParams: ThemeParams;
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  close: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
  };
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const tg: TelegramWebApp | undefined = window.Telegram?.WebApp;
export const initData = tg?.initData ?? '';
export const colorScheme = tg?.colorScheme ?? 'dark';

export function tgReady() { tg?.ready(); }
export function tgExpand() { tg?.expand(); }
export function tgClose() { tg?.close(); }
export function hapticLight() { tg?.HapticFeedback?.impactOccurred('light'); }
export function hapticSuccess() { tg?.HapticFeedback?.notificationOccurred('success'); }
export function hapticError() { tg?.HapticFeedback?.notificationOccurred('error'); }

export function showBackButton(onClick: () => void): () => void {
  tg?.BackButton?.onClick(onClick);
  tg?.BackButton?.show();
  return () => {
    tg?.BackButton?.offClick(onClick);
    tg?.BackButton?.hide();
  };
}
