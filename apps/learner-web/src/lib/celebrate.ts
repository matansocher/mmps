// Lightweight, dependency-free celebration effects (Web Animations API) + Telegram haptics.

type HapticFeedback = {
  notificationOccurred?: (type: 'success' | 'warning' | 'error') => void;
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
};

const COLORS = ['#20c7bd', '#67e8df', '#56d364', '#ffb454', '#bca7ff', '#58a6ff'];

function haptics(): HapticFeedback | undefined {
  const webApp = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: HapticFeedback; isVersionAtLeast?: (v: string) => boolean } } }).Telegram?.WebApp;
  return webApp?.isVersionAtLeast?.('6.1') ? webApp.HapticFeedback : undefined;
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function layer(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'celebrate-layer';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

function piece(parent: HTMLElement, x: number, y: number, color: string, shape: 'dot' | 'strip' | 'star'): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = `celebrate-piece ${shape}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.background = shape === 'star' ? 'none' : color;
  el.style.color = color;
  if (shape === 'star') el.textContent = '✦';
  parent.appendChild(el);
  return el;
}

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Small sparkle burst radiating from an element — used for a correct answer.
export function celebrateCorrect(target?: Element | null): void {
  haptics()?.notificationOccurred?.('success');
  if (reducedMotion() || !target) return;
  const rect = target.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const root = layer();
  const count = 18;
  const animations = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + random(-0.2, 0.2);
    const distance = random(40, Math.min(110, rect.width / 2 + 40));
    const el = piece(root, originX, originY, COLORS[i % COLORS.length], i % 3 === 0 ? 'star' : 'dot');
    return el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * distance * 1.15}px), calc(-50% + ${Math.sin(angle) * distance * 1.15 + 14}px)) scale(0.6)`, opacity: 0 },
      ],
      { duration: random(550, 800), easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    ).finished;
  });
  Promise.all(animations).finally(() => root.remove());
}

export function feedbackWrong(): void {
  haptics()?.notificationOccurred?.('error');
}

// Full-screen confetti shower — used when a lesson is completed / a quiz is passed.
export function celebrateLesson(): void {
  haptics()?.notificationOccurred?.('success');
  if (reducedMotion()) return;
  const root = layer();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const count = Math.min(140, Math.round(width / 5));
  const animations = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const startX = fromLeft ? random(-20, width * 0.15) : random(width * 0.85, width + 20);
    const startY = height * random(0.55, 0.85);
    const el = piece(root, startX, startY, COLORS[i % COLORS.length], i % 4 === 0 ? 'dot' : 'strip');
    const peakX = startX + (fromLeft ? 1 : -1) * random(width * 0.15, width * 0.6);
    const peakY = random(height * 0.05, height * 0.35);
    const endX = peakX + random(-60, 60);
    const spin = random(360, 1080) * (Math.random() > 0.5 ? 1 : -1);
    return el.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${peakX - startX}px, ${peakY - startY}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${endX - startX}px, ${height - startY + 40}px) rotate(${spin}deg)`, opacity: 0.2 },
      ],
      { duration: random(1800, 2800), delay: random(0, 180), easing: 'cubic-bezier(0.25, 0.6, 0.35, 1)', fill: 'forwards' },
    ).finished;
  });
  Promise.all(animations).finally(() => root.remove());
}
