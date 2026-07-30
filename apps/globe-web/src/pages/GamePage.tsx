import { AnimatePresence } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import { EndScreen } from '../components/EndScreen';
import { GameHUD } from '../components/GameHUD';
import { Globe } from '../components/Globe';
import { StartScreen } from '../components/StartScreen';
import { advance, clearFlash, currentTarget, guess, initialState, shouldAssist, startRound } from '../lib/game';
import { listContinents, loadPlayableCountries } from '../lib/countries';
import type { Continent, Country, GameState } from '../types';

const CORRECT_ADVANCE_MS = 950;
const WRONG_FLASH_MS = 650;

export function GamePage() {
  const countries = useMemo(() => loadPlayableCountries(), []);
  const continents = useMemo(() => listContinents(countries), [countries]);

  const [state, setState] = useState<GameState>(initialState);
  const [continent, setContinent] = useState<Continent | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ readonly lat: number; readonly lon: number } | null>(null);
  const busyRef = useRef(false);

  const target = currentTarget(state);
  const assist = shouldAssist(state);
  // Once the player has struggled, gently guide them to the target's region.
  const assistFly = assist && target ? { lat: target.lat, lon: target.lon } : null;

  const begin = useCallback(() => {
    setHovered(null);
    setFlyTo(null);
    setState(startRound(countries, continent ?? undefined));
  }, [countries, continent]);

  const handlePick = useCallback(
    (country: Country) => {
      if (busyRef.current || state.status !== 'playing') return;
      const { state: next, correct } = guess(state, country);
      setState(next);

      if (correct) {
        busyRef.current = true;
        const solved = next.queue[next.index];
        if (solved) setFlyTo({ lat: solved.lat, lon: solved.lon });
        window.setTimeout(() => {
          setState((s) => advance(s));
          setFlyTo(null);
          busyRef.current = false;
        }, CORRECT_ADVANCE_MS);
      } else {
        window.setTimeout(() => setState((s) => clearFlash(s)), WRONG_FLASH_MS);
      }
    },
    [state],
  );

  const interactive = state.status !== 'start';

  return (
    <div className="relative h-full w-full">
      <Globe
        countries={countries}
        hoveredAlpha3={hovered}
        correctAlpha3={state.lastCorrectAlpha3}
        wrongAlpha3={state.lastWrongAlpha3}
        onHover={setHovered}
        onPick={handlePick}
        flyTo={flyTo ?? assistFly}
        interactive={interactive}
      />

      {state.status === 'playing' && <GameHUD state={state} />}

      <AnimatePresence>
        {state.status === 'start' && (
          <StartScreen key="start" continents={continents} selectedContinent={continent} onSelectContinent={setContinent} onStart={begin} />
        )}
        {state.status === 'roundEnd' && (
          <EndScreen key="end" score={state.score} solved={state.solved} onPlayAgain={begin} onChangeRegion={() => setState(initialState())} />
        )}
      </AnimatePresence>
    </div>
  );
}
