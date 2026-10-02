import { useEffect, useRef } from 'react';
import type { Toast } from '../hooks/useToasts';

export function Toasts({ toasts, onDismiss }: { readonly toasts: readonly Toast[]; readonly onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed top-20 left-1/2 z-50 flex w-[min(420px,calc(100vw-24px))] -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm shadow-lg ${t.tone === 'error' ? 'bg-[#5c1d1d]/95 text-red-50' : 'bg-[#202124]/95 text-white'}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

export function Splash({ visible, progress }: { readonly visible: boolean; readonly progress: number }) {
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#0d1730_0%,#000_70%)] transition-opacity duration-700 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!visible}
    >
      <div className="relative mb-6 h-20 w-20 rounded-full bg-[radial-gradient(circle_at_35%_35%,#8ab4f8,#1a73e8_45%,#0b1e3a_75%)] shadow-[0_0_60px_rgb(66_133_244/0.45)]" />
      <div className="text-xl font-semibold tracking-wide">Earth</div>
      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-[var(--color-accent)] transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}

export function ErrorScreen({ title, message, onRetry }: { readonly title: string; readonly message: string; readonly onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-6">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-white/65">{message}</p>
        {onRetry && (
          <button type="button" className="chip" aria-pressed="true" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ['Drag', 'Rotate the globe'],
  ['Scroll / pinch', 'Zoom'],
  ['Right-drag', 'Zoom'],
  ['Ctrl/Shift + drag, middle-drag', 'Tilt and rotate'],
  ['Double-click', 'Zoom in on a point'],
  ['/', 'Search'],
  ['← ↑ → ↓', 'Move'],
  ['+ / −', 'Zoom in / out'],
  ['N', 'Reset to north'],
  ['U', 'Toggle 2D / 3D tilt'],
  ['R', 'Reset view'],
  ['Esc', 'Close panels, stop tour'],
  ['?', 'Show this help'],
];

export function HelpDialog({ onClose }: { readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="glass m-auto w-[min(460px,calc(100vw-24px))] rounded-2xl p-0 text-white backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h2 className="font-semibold">Navigation & shortcuts</h2>
        <button type="button" className="chip" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-5 py-4 text-sm">
        {SHORTCUTS.map(([key, desc]) => (
          <div key={key} className="contents">
            <dt className="font-mono text-[13px] text-[var(--color-accent)]">{key}</dt>
            <dd className="text-white/75">{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="px-5 pb-4 text-xs text-white/40">Imagery and 3D data © Google and its data providers. Labels and borders: Natural Earth.</p>
    </dialog>
  );
}
