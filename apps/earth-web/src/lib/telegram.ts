type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: {
    notificationOccurred?: (type: 'success' | 'error' | 'warning') => void;
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    selectionChanged?: () => void;
  };
};

export type HapticKind = 'success' | 'error' | 'tap';

const VIBRATION_MS: Record<HapticKind, number | number[]> = { success: 18, error: [30, 40, 30], tap: 8 };

const APP_BACKGROUND = '#060a12';

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

export function haptic(kind: HapticKind): void {
  const feedback = telegramWebApp()?.HapticFeedback;
  try {
    if (feedback) {
      if (kind === 'tap') feedback.selectionChanged?.();
      else feedback.notificationOccurred?.(kind);
      return;
    }
    navigator.vibrate?.(VIBRATION_MS[kind]);
  } catch {
    // Haptics are a nicety; ignore unsupported devices.
  }
}
