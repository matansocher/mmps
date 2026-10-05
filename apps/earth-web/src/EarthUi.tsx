import { useCallback, useEffect, useState } from 'react';
import { Collection } from './components/Collection';
import { HomeMenu } from './components/HomeMenu';
import { Icon } from './components/Icon';
import { NavControls } from './components/NavControls';
import { HelpDialog } from './components/Overlays';
import { bestScoreKey, type GameMode } from './game/modes';
import { COLORS } from './globe/colors';
import { ClassicGame } from './games/ClassicGame';
import { CleanupGame } from './games/CleanupGame';
import { focusCountry } from './games/focus';
import { NameItGame } from './games/NameItGame';
import { flyToView, HOME_VIEW, nudge, resetNorth, zoomBy } from './globe/camera';
import type { EarthEngine } from './globe/engine';
import { useHeading } from './hooks/useHeading';
import { useKeyboard } from './hooks/useKeyboard';
import { useSoundEnabled } from './store/sound';

function Game({ engine, mode, onChangeMode }: { readonly engine: EarthEngine; readonly mode: GameMode; readonly onChangeMode: () => void }) {
  switch (mode.kind) {
    case 'daily':
    case 'classic':
    case 'continent':
      return <ClassicGame engine={engine} mode={mode} onChangeMode={onChangeMode} />;
    case 'name-it':
      return <NameItGame engine={engine} mode={mode} onChangeMode={onChangeMode} />;
    case 'cleanup':
      return <CleanupGame engine={engine} mode={mode} onChangeMode={onChangeMode} />;
  }
}

export function EarthUi({ engine }: { readonly engine: EarthEngine }) {
  const { viewer, layer, countries } = engine;
  const [mode, setMode] = useState<GameMode | null>(null);
  const [help, setHelp] = useState(false);
  const [collection, setCollection] = useState(false);
  const [sound, toggleSound] = useSoundEnabled();
  const heading = useHeading(engine);

  useEffect(() => {
    // The menu sheet covers the bottom 64% on phones; lift the globe into the remaining space.
    viewer.container.classList.toggle('globe-lifted', !mode);
  }, [viewer, mode]);

  const goHome = useCallback(() => void flyToView(viewer, HOME_VIEW, 1.5), [viewer]);
  const changeMode = useCallback(() => {
    setMode(null);
    layer.resetColors();
    goHome();
  }, [layer, goHome]);
  const pickMode = useCallback(
    (next: GameMode) => {
      layer.resetColors();
      setMode(next);
    },
    [layer],
  );
  const showCountry = useCallback(
    (code: string) => {
      layer.resetColors();
      layer.setColor(code, COLORS.review);
      focusCountry(engine, code);
    },
    [engine, layer],
  );

  useKeyboard({
    '+': () => zoomBy(viewer, 0.5),
    '=': () => zoomBy(viewer, 0.5),
    '-': () => zoomBy(viewer, 2),
    _: () => zoomBy(viewer, 2),
    ArrowLeft: () => nudge(viewer, 'left'),
    ArrowRight: () => nudge(viewer, 'right'),
    ArrowUp: () => nudge(viewer, 'up'),
    ArrowDown: () => nudge(viewer, 'down'),
    n: () => resetNorth(viewer),
    r: () => goHome(),
    p: () => !mode && setCollection(true),
    '?': () => setHelp(true),
  });

  return (
    <>
      {mode ? <Game key={bestScoreKey(mode)} engine={engine} mode={mode} onChangeMode={changeMode} /> : <HomeMenu countries={countries.countries} onPick={pickMode} onCollection={() => setCollection(true)} />}
      <NavControls raised={!mode} heading={heading} onResetNorth={() => resetNorth(viewer)} onHome={goHome} onZoomIn={() => zoomBy(viewer, 0.5)} onZoomOut={() => zoomBy(viewer, 2)} />
      <div className={`fixed bottom-6 left-4 z-20 flex flex-col gap-2 max-sm:left-3 ${mode ? '' : 'max-sm:bottom-[calc(64dvh+12px)] sm:left-[552px]'}`}>
        <button type="button" className="panel icon-btn" aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} aria-pressed={!sound} title={sound ? 'Mute' : 'Sound on'} onClick={toggleSound}>
          <Icon name={sound ? 'volume' : 'mute'} />
        </button>
        <button type="button" className="panel icon-btn" aria-label="How to play" title="How to play (?)" onClick={() => setHelp(true)}>
          <Icon name="help" />
        </button>
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      {collection && <Collection countries={countries.countries} onShowCountry={showCountry} onClose={() => setCollection(false)} />}
    </>
  );
}
