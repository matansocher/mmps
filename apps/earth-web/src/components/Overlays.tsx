import { useEffect, useRef, useState } from 'react';

const FACTS = [
  'Russia spans 11 time zones.',
  'Africa has 54 countries, more than any other continent.',
  'Vatican City is smaller than most city parks.',
  'Canada has the longest coastline on Earth.',
  'Chile is about 4,300 km long and rarely 350 km wide.',
];

// Wireframe globe: meridians squash and stretch to fake a spin, no image or WebGL needed.
function WireGlobe() {
  return (
    <svg width="112" height="112" viewBox="-60 -60 120 120" className="text-[var(--color-accent-soft)]" aria-hidden="true">
      <circle r="54" fill="rgb(110 168 255 / 0.08)" stroke="currentColor" strokeWidth="1.5" />
      {[-34, 0, 34].map((y) => (
        <ellipse key={y} cy={y} rx={y === 0 ? 54 : 43} ry="7" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} rx="54" ry="54" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" className="splash-meridian" style={{ animationDelay: `${i * -0.75}s` }} />
      ))}
    </svg>
  );
}

export function Splash({ visible }: { readonly visible: boolean }) {
  const [fact, setFact] = useState(() => Math.floor(Math.random() * FACTS.length));
  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setFact((i) => (i + 1) % FACTS.length), 3000);
    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center transition-opacity duration-700 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      role="status"
      aria-hidden={!visible}
    >
      <WireGlobe />
      <div className="mt-6 text-[28px] font-bold">Find the Country</div>
      <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="splash-bar h-full w-2/5 rounded-full bg-[var(--color-accent)] motion-reduce:animate-none" />
      </div>
      <p className="mt-5 min-h-10 max-w-[300px] text-[15px] leading-snug text-white/75">
        <span className="eyebrow mb-1 block">Did you know</span>
        {FACTS[fact]}
      </p>
    </div>
  );
}

type ErrorProps = {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
  readonly onRetry?: () => void;
};

export function ErrorScreen({ title, message, detail, onRetry }: ErrorProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-bg)] p-6" role="alert">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-tile)] text-[30px]" aria-hidden="true">
          🛰️
        </div>
        <h1 className="mb-2 text-[26px] font-bold">{title}</h1>
        <p className="mb-6 text-[15px] leading-relaxed text-white/75">{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        {detail && <p className="mt-6 font-mono text-[12px] break-words text-white/75">{detail}</p>}
      </div>
    </div>
  );
}

const MODES: ReadonlyArray<readonly [string, string]> = [
  ['Daily challenge', 'The same 10 countries for everyone, once a day. It only counts once you finish all 10. Play every day to build a streak and earn 1.5× XP.'],
  ['Classic', '10 countries, one click each. Miss and a pin shows where it really is, with its neighbours.'],
  ['Continent sprint', 'Classic rules, but every country comes from the continent you pick.'],
  ['Name it', 'A country is highlighted on the globe. Pick its name from 4 options, all from the same neighbourhood.'],
  ['Continent cleanup', 'Find every country on a continent. One miss marks it as missed, and the map fills in as you go.'],
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
  ['M', 'Back to menu'],
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
            <span className="font-bold text-white">{name}</span> — {rule}
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
      <p className="px-5 pb-4 text-xs text-white/75">Country shapes: Natural Earth (public domain).</p>
    </dialog>
  );
}
