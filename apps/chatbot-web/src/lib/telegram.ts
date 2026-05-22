type TgWebApp = {
  ready(): void;
  expand(): void;
  initData: string;
  themeParams: Record<string, string>;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
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

export function showBackButton(onClick: () => void): () => void {
  const w = getWebApp();
  if (!w) return () => {};
  w.BackButton.show();
  w.BackButton.onClick(onClick);
  return () => {
    w.BackButton.offClick(onClick);
    w.BackButton.hide();
  };
}

export function haptic(type: 'success' | 'error' | 'select'): void {
  const hf = getWebApp()?.HapticFeedback;
  if (!hf) return;
  if (type === 'select') hf.selectionChanged();
  else hf.notificationOccurred(type);
}
