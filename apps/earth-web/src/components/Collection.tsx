import { useEffect, useRef } from 'react';
import { CONTINENTS } from '../game/modes';
import { ACHIEVEMENTS, levelFor } from '../game/progression';
import { useProgress } from '../store/progress';
import type { Country } from '../types';
import { Icon } from './Icon';

type Props = {
  readonly countries: readonly Country[];
  readonly onShowCountry: (code: string) => void;
  readonly onClose: () => void;
};

export function Collection({ countries, onShowCountry, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const progress = useProgress();
  const { level } = levelFor(progress.miles);
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
      className="m-auto flex max-h-[min(88dvh,820px)] w-[min(720px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl bg-[#0d1422] p-0 text-[#e7ebf3] ring-1 ring-[var(--color-rule)] backdrop:bg-black/60 [&:not([open])]:hidden"
      aria-labelledby="collection-title"
    >
      <header className="flex items-center gap-4 border-b border-[var(--color-rule)] px-5 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent-soft)]">
          <Icon name="flag" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="collection-title" className="text-[22px] leading-none font-bold">
            Collection
          </h2>
          <div className="mt-1 text-[14px] text-white/55 tabular-nums">
            Level {level.level} · {progress.miles.toLocaleString()} XP · {found} of {total} found
          </div>
        </div>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10" aria-label="Close collection" onClick={() => ref.current?.close()}>
          <Icon name="close" />
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-[17px] font-bold">Achievements</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = progress.achievements.includes(a.id);
            return (
              <li key={a.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${unlocked ? 'bg-[var(--color-tile)]' : 'border border-dashed border-white/15 text-white/50'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${unlocked ? 'bg-[var(--color-accent)] text-white' : 'bg-white/6'}`} aria-hidden="true">
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
              <h3 className="flex items-baseline justify-between text-[17px] font-bold">
                {continent}
                <span className="text-[14px] text-white/50 tabular-nums">
                  {got}/{list.length}
                </span>
              </h3>
              <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
                {list.map((c) => {
                  const seen = !!progress.stamps[c.code];
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => show(c.code)}
                        className={`flex h-[72px] w-full flex-col items-center justify-center rounded-lg px-1 text-center text-[12px] leading-tight transition-transform hover:scale-[1.03] ${seen ? 'bg-[var(--color-tile)] ring-1 ring-[var(--color-ok)]/50' : 'border border-dashed border-white/12 text-white/35'}`}
                        aria-label={`${c.name}${seen ? `, found ${progress.stamps[c.code]} times` : ', not found yet'}`}
                      >
                        <span className={`text-[22px] ${seen ? '' : 'opacity-30 grayscale'}`} aria-hidden="true">
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
