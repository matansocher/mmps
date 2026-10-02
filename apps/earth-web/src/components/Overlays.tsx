import { useEffect, useRef } from 'react';

export function Splash({ visible }: { readonly visible: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#0d1730_0%,#000_70%)] transition-opacity duration-700 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!visible}
    >
      <div className="relative mb-6 h-20 w-20 animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_35%,#f4f5f0_0_18%,#1f5fa8_19%_60%,#0b1e3a_80%)] shadow-[0_0_60px_rgb(66_133_244/0.45)]" />
      <div className="text-xl font-semibold tracking-wide">Find the Country</div>
      <div className="mt-2 text-sm text-white/50">Loading the globe…</div>
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
  ['Click', 'Pick a country'],
  ['Drag', 'Spin the globe'],
  ['Scroll / pinch', 'Zoom'],
  ['← ↑ → ↓', 'Spin'],
  ['+ / −', 'Zoom in / out'],
  ['Enter', 'Next question'],
  ['S', 'Skip'],
  ['N', 'Reset to north'],
  ['R', 'Show the whole globe'],
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
        <h2 className="font-semibold">How to play</h2>
        <button type="button" className="chip" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      <p className="px-5 pt-4 text-sm leading-relaxed text-white/75">
        Each round asks for 10 countries. Spin and zoom the globe, then click the country you’re asked for. You get one try per country — if you miss, the right one lights up in green.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-5 py-4 text-sm">
        {SHORTCUTS.map(([key, desc]) => (
          <div key={key} className="contents">
            <dt className="font-mono text-[13px] text-[var(--color-accent)]">{key}</dt>
            <dd className="text-white/75">{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="px-5 pb-4 text-xs text-white/40">Country shapes: Natural Earth (public domain).</p>
    </dialog>
  );
}
