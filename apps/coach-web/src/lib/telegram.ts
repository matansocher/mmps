type TgWebApp = {
  ready(): void;
  expand(): void;
  initData: string;
  isVersionAtLeast?(version: string): boolean;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  openLink?(url: string): void;
  BackButton?: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
  HapticFeedback?: {
    selectionChanged(): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
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

export function initTelegram(): void {
  const w = getWebApp();
  if (!w?.initData) return;
  w.ready();
  w.expand();
  if (supports('6.1')) {
    w.setHeaderColor?.('#0A0E14');
    w.setBackgroundColor?.('#0A0E14');
  }
}

// The Telegram SDK throws for features the host client doesn't support (e.g. in a plain browser it reports v6.0).
function supports(version: string): boolean {
  const w = getWebApp();
  return Boolean(w?.initData && w.isVersionAtLeast?.(version));
}

export function showBackButton(onClick: () => void): () => void {
  const back = getWebApp()?.BackButton;
  if (!back || !supports('6.1')) return () => {};
  back.show();
  back.onClick(onClick);
  return () => {
    back.offClick(onClick);
    back.hide();
  };
}

// Inside Telegram, plain target=_blank links can open in the mini app webview or be swallowed, so hand them to the client.
export function openExternalLink(url: string): boolean {
  const w = getWebApp();
  if (!w?.initData || !w.openLink) return false;
  w.openLink(url);
  return true;
}

export function hapticSelect(): void {
  if (!supports('6.1')) return;
  try {
    getWebApp()?.HapticFeedback?.selectionChanged();
  } catch {
    // haptics are best-effort
  }
}

// Telegram's success haptic inside the mini app; a short vibration pattern in plain browsers that support it.
export function hapticSuccess(): void {
  if (supports('6.1')) {
    try {
      getWebApp()?.HapticFeedback?.notificationOccurred('success');
      return;
    } catch {
      // fall through to the browser vibration
    }
  }
  navigator.vibrate?.([40, 60, 40]);
}
