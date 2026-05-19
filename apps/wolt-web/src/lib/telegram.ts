type TgWebApp = {
  ready(): void;
  expand(): void;
  initData: string;
  themeParams: Record<string, string>;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function openExternal(url: string): void {
  const w = getWebApp();
  if (w?.openLink) {
    w.openLink(url);
    return;
  }
  window.open(url, '_blank');
}

export function haptic(type: 'success' | 'error' | 'select'): void {
  const hf = getWebApp()?.HapticFeedback;
  if (!hf) return;
  if (type === 'select') hf.selectionChanged();
  else hf.notificationOccurred(type);
}
