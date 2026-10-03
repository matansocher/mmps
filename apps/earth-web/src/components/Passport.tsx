import { useEffect, useRef } from 'react';
import { CONTINENTS } from '../game/modes';
import { ACHIEVEMENTS, tierFor } from '../game/progression';
import { useProgress } from '../store/progress';
import type { Country } from '../types';
import { Icon } from './Icon';

type Props = {
  readonly countries: readonly Country[];
  readonly onShowCountry: (code: string) => void;
  readonly onClose: () => void;
};

const tilt = (code: string) => ((code.charCodeAt(0) * 7 + code.charCodeAt(1) * 13) % 13) - 6;

export function Passport({ countries, onShowCountry, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const progress = useProgress();
  const { tier } = tierFor(progress.miles);
  const found = Object.keys(progress.stamps).length;
  const total = countries.filter((c) => (CONTINENTS as readonly string[]).includes(c.continent)).length;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const show = (code: string) => {
    ref.current?.close();
    onShowCountry(code);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto flex max-h-[min(88dvh,820px)] w-[min(720px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl bg-[var(--color-paper)] p-0 text-[var(--color-paper-ink)] backdrop:bg-black/60 [&:not([open])]:hidden"
      aria-labelledby="passport-title"
    >
      <header className="flex items-center gap-4 bg-[var(--color-passport)] px-5 py-4 text-[#f3d98a]">
        <Icon name="passport" size={36} />
        <div className="min-w-0 flex-1">
          <h2 id="passport-title" className="board-type text-[26px] leading-none font-bold">
            Passport
          </h2>
          <div className="mt-1 text-[14px] text-[#f3d98a]/80">
            {tier.name} · {progress.miles.toLocaleString()} mi · {found} of {total} stamps
          </div>
        </div>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10" aria-label="Close passport" onClick={() => ref.current?.close()}>
          <Icon name="close" />
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
        <h3 className="board-type text-[19px] font-bold">Achievements</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = progress.achievements.includes(a.id);
            return (
              <li key={a.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${unlocked ? 'bg-[var(--color-paper-ink)] text-[var(--color-paper)]' : 'border border-dashed border-[var(--color-paper-ink)]/25 text-[var(--color-paper-ink)]/60'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${unlocked ? 'bg-[var(--color-signage)] text-[var(--color-ink)]' : 'bg-[var(--color-paper-ink)]/8'}`} aria-hidden="true">
                  {unlocked ? '★' : <Icon name="lock" size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{a.title}</span>
                  <span className="block text-[13px] opacity-75">{a.detail}</span>
                </span>
                <span className="sr-only">{unlocked ? 'Unlocked' : 'Locked'}</span>
              </li>
            );
          })}
        </ul>

        {CONTINENTS.map((continent) => {
          const list = countries.filter((c) => c.continent === continent).sort((a, b) => a.name.localeCompare(b.name));
          const got = list.filter((c) => progress.stamps[c.code]).length;
          return (
            <section key={continent} className="mt-5">
              <h3 className="board-type flex items-baseline justify-between text-[19px] font-bold">
                {continent}
                <span className="text-[15px] opacity-60 tabular-nums">
                  {got}/{list.length}
                </span>
              </h3>
              <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
                {list.map((c) => {
                  const stamped = !!progress.stamps[c.code];
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => show(c.code)}
                        className={`flex h-[72px] w-full flex-col items-center justify-center rounded-lg px-1 text-center text-[12px] leading-tight transition-transform hover:scale-105 ${stamped ? 'border-2 border-[#1f7a4d] text-[#1f7a4d]' : 'border border-dashed border-[var(--color-paper-ink)]/20 text-[var(--color-paper-ink)]/35'}`}
                        style={stamped ? { rotate: `${tilt(c.code)}deg` } : undefined}
                        aria-label={`${c.name}${stamped ? `, stamped ${progress.stamps[c.code]} times` : ', not visited yet'}`}
                      >
                        <span className={`text-[22px] ${stamped ? '' : 'opacity-30 grayscale'}`} aria-hidden="true">
                          {c.flag}
                        </span>
                        <span className="line-clamp-2 font-bold">{c.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
