import { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../game/modes';
import { localDay } from '../game/progression';
import { COLORS } from '../globe/colors';
import type { EarthEngine } from '../globe/engine';
import { focusCountry } from '../games/focus';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { readJson, writeJson } from '../lib/storage';
import { haptic } from '../lib/telegram';

const SEEN_KEY = 'seenOnboarding';
const PRACTICE_CODE = 'BR';
const STEPS = 3;

export const hasSeenOnboarding = () => readJson(SEEN_KEY, false, (value): value is boolean => typeof value === 'boolean');

type Props = {
  readonly engine: EarthEngine;
  readonly onPick: (mode: GameMode) => void;
  readonly onDone: () => void;
};

export function Onboarding({ engine, onPick, onDone }: Props) {
  const { layer, countries } = engine;
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const practice = countries.countries.find((c) => c.code === PRACTICE_CODE);
  useBottomSheet(sheetRef);

  useEffect(() => {
    if (step !== 1) return;
    layer.resetColors();
    layer.setColor(PRACTICE_CODE, COLORS.target);
    focusCountry(engine, PRACTICE_CODE);
  }, [engine, layer, step]);

  useGlobePointer(engine, step === 1 && !found, (country) => {
    if (country.code === PRACTICE_CODE) {
      layer.setColor(PRACTICE_CODE, COLORS.correct);
      haptic('success');
      setHint(null);
      setFound(true);
      window.setTimeout(() => setStep(2), 900);
      return;
    }
    haptic('error');
    setHint(`That’s ${country.name}. Look for the highlighted country in South America.`);
  });

  const finish = () => {
    writeJson(SEEN_KEY, true);
    layer.resetColors();
    onDone();
  };
  const playDaily = () => {
    writeJson(SEEN_KEY, true);
    onPick({ kind: 'daily', day: localDay(new Date()) });
  };

  return (
    <section
      ref={sheetRef}
      className="panel animate-rise fixed bottom-0 left-0 z-30 w-full rounded-t-[22px] border-b-0 px-5 pt-4 pb-[calc(16px+var(--safe-bottom))] sm:top-4 sm:bottom-auto sm:left-4 sm:w-[400px] sm:rounded-[22px] sm:border-b sm:pb-5"
      aria-labelledby="onboarding-title"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {step + 1} / {STEPS}
        </span>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-[var(--color-accent)]' : 'w-1.5 bg-white/25'}`} />
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {step === 0 && (
          <>
            <h2 id="onboarding-title" className="mt-3 text-[22px] leading-tight font-bold">
              Drag to spin, pinch to zoom
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-white/75">The whole world is in your hands. Give the globe a spin to get a feel for it.</p>
          </>
        )}
        {step === 1 && (
          <>
            <h2 id="onboarding-title" className="mt-3 text-[22px] leading-tight font-bold">
              {found ? `Nice, that’s ${practice?.name ?? 'Brazil'}!` : 'Now tap a country'}
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-white/75">
              {found ? 'That’s all there is to it.' : (hint ?? `Each round names a country and you find it on the globe. Try ${practice?.flag ?? ''} ${practice?.name ?? 'Brazil'}, highlighted for you.`)}
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <h2 id="onboarding-title" className="mt-3 text-[22px] leading-tight font-bold">
              Ready for today’s 10?
            </h2>
            <p className="mt-1 text-[15px] leading-snug text-white/75">The daily is the same for everyone. Play it each day to build a streak and earn 1.5× XP.</p>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {step < 2 ? (
          <>
            <button type="button" className="btn flex-1" onClick={finish}>
              Skip
            </button>
            {(step === 0 || !found) && (
              <button type="button" className="btn btn-primary flex-1" onClick={() => setStep(step + 1)}>
                {step === 1 ? 'Skip this step' : 'Next'}
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="btn flex-1" onClick={finish}>
              See all modes
            </button>
            <button type="button" className="btn btn-primary flex-[1.4]" onClick={playDaily} autoFocus>
              Play today’s daily
            </button>
          </>
        )}
      </div>
    </section>
  );
}
