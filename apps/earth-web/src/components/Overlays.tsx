import { useEffect, useRef } from 'react';

export function Splash({ visible }: { readonly visible: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-ink)] transition-opacity duration-700 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!visible}
    >
      <div className="mb-6 h-20 w-20 animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_35%,#f4f6f8_0_22%,#1d4e89_23%_100%)] ring-2 ring-[var(--color-accent)]/40 motion-reduce:animate-none" />
      <div className="text-[28px] font-bold">Find the Country</div>
      <div className="mt-1 text-[16px] text-white/60">Loading the globe…</div>
    </div>
  );
}

export function ErrorScreen({ title, message, onRetry }: { readonly title: string; readonly message: string; readonly onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-ink)] p-6">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-[28px] font-bold">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-white/65">{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

const MODES: ReadonlyArray<readonly [string, string]> = [
  ['Daily challenge', 'The same 10 countries for everyone, once a day. Play daily to build a streak and earn 1.5× XP.'],
  ['Classic', '10 countries, one click each. Miss and the right one lights up in green.'],
  ['Continent sprint', 'Classic rules, but every country comes from the continent you pick.'],
  ['Name it', 'A country lights up on the globe. Pick its name from 4 options, all from the same neighbourhood.'],
  ['Continent cleanup', 'Find every country on a continent. One miss marks it in red, and the map fills in as you go.'],
  ['XP & collection', 'Every round earns XP that raises your level. Each country you find joins your collection. Progress stays on this device.'],
];

const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ['Click', 'Pick a country'],
  ['Drag', 'Spin the globe'],
  ['Scroll / pinch', 'Zoom'],
  ['← ↑ → ↓', 'Spin'],
  ['+ / −', 'Zoom in / out'],
  ['1–4', 'Pick an answer in Name it'],
  ['Enter', 'Next question'],
  ['S', 'Skip / give up'],
  ['M', 'Change mode'],
  ['P', 'Open collection'],
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
        <h2 className="text-[22px] font-bold">How to play</h2>
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
            <dt className="font-mono text-[13px] text-[var(--color-accent-soft)]">{key}</dt>
            <dd className="text-white/75">{desc}</dd>
          </div>
        ))}
      </dl>
      <p className="px-5 pb-4 text-xs text-white/40">Country shapes: Natural Earth (public domain).</p>
    </dialog>
  );
}
