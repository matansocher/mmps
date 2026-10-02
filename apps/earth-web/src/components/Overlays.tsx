import { useEffect, useRef } from 'react';

export function Splash({ visible }: { readonly visible: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-ink)] transition-opacity duration-700 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!visible}
    >
      <div className="mb-6 h-20 w-20 animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_35%,#efe5cf_0_22%,#0e3440_23%_100%)] ring-2 ring-[var(--color-signage)]/40 motion-reduce:animate-none" />
      <div className="board-type text-[28px] font-bold">Find the Country</div>
      <div className="board-type mt-1 text-[17px] font-semibold text-[var(--color-signage)]">Now boarding…</div>
    </div>
  );
}

export function ErrorScreen({ title, message, onRetry }: { readonly title: string; readonly message: string; readonly onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-ink)] p-6">
      <div className="max-w-md text-center">
        <h1 className="board-type mb-2 text-[28px] font-bold">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-white/65">{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-signage" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

const MODES: ReadonlyArray<readonly [string, string]> = [
  ['Today’s flight', 'The same 10 countries for everyone, once a day. Fly daily to build a streak and earn 1.5× miles.'],
  ['Classic', '10 countries, one click each. Miss and the right one lights up in green.'],
  ['Time Attack', 'As many countries as you can in 60 seconds. A wrong click or a skip costs 3 seconds.'],
  ['Continent Sprint', 'Classic rules, but every country comes from the continent you pick.'],
  ['Neighbours', 'Click every country bordering the yellow one. Three misses ends the question.'],
  ['Miles & passport', 'Every round earns miles that lift your tier. Each country you find stamps your passport. Progress stays on this device.'],
];

const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ['Click', 'Pick a country'],
  ['Drag', 'Spin the globe'],
  ['Scroll / pinch', 'Zoom'],
  ['← ↑ → ↓', 'Spin'],
  ['+ / −', 'Zoom in / out'],
  ['Enter', 'Next question'],
  ['S', 'Skip / give up'],
  ['M', 'Change mode'],
  ['P', 'Open passport'],
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
      className="panel m-auto max-h-[calc(100dvh-24px)] w-[min(480px,calc(100vw-24px))] overflow-y-auto rounded-2xl p-0 text-white backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-5 py-3">
        <h2 className="board-type text-[22px] font-bold">How to play</h2>
        <button type="button" className="btn" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      <ul className="space-y-1.5 px-5 pt-4 text-sm leading-relaxed text-white/75">
        {MODES.map(([name, rule]) => (
          <li key={name}>
            <span className="font-medium text-white">{name}</span> — {rule}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-5 py-4 text-sm">
        {SHORTCUTS.map(([key, desc]) => (
          <div key={key} className="contents">
            <dt className="font-mono text-[13px] text-[var(--color-signage)]">{key}</dt>
            <dd className="text-white/75">{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="px-5 pb-4 text-xs text-white/40">Country shapes: Natural Earth (public domain).</p>
    </dialog>
  );
}
