import { useCallback, useState } from 'react';
import { Icon } from './components/Icon';
import { ModePicker } from './components/ModePicker';
import { NavControls } from './components/NavControls';
import { HelpDialog } from './components/Overlays';
import { bestScoreKey, type GameMode } from './game/modes';
import { ClassicGame } from './games/ClassicGame';
import { NeighboursGame } from './games/NeighboursGame';
import { TimeAttackGame } from './games/TimeAttackGame';
import { flyToView, HOME_VIEW, nudge, resetNorth, zoomBy } from './globe/camera';
import type { EarthEngine } from './globe/engine';
import { useHeading } from './hooks/useHeading';
import { useKeyboard } from './hooks/useKeyboard';

function Game({ engine, mode, onChangeMode }: { readonly engine: EarthEngine; readonly mode: GameMode; readonly onChangeMode: () => void }) {
  switch (mode.kind) {
    case 'classic':
    case 'continent':
      return <ClassicGame engine={engine} mode={mode} onChangeMode={onChangeMode} />;
    case 'time-attack':
      return <TimeAttackGame engine={engine} mode={mode} onChangeMode={onChangeMode} />;
    case 'neighbours':
      return <NeighboursGame engine={engine} mode={mode} onChangeMode={onChangeMode} />;
  }
}

export function EarthUi({ engine }: { readonly engine: EarthEngine }) {
  const { viewer, layer } = engine;
  const [mode, setMode] = useState<GameMode | null>(null);
  const [help, setHelp] = useState(false);
  const heading = useHeading(engine);

  const goHome = useCallback(() => void flyToView(viewer, HOME_VIEW, 1.5), [viewer]);
  const changeMode = useCallback(() => {
    setMode(null);
    layer.resetColors();
    goHome();
  }, [layer, goHome]);

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
    '?': () => setHelp(true),
  });

  return (
    <>
      {mode ? <Game key={bestScoreKey(mode)} engine={engine} mode={mode} onChangeMode={changeMode} /> : <ModePicker onPick={setMode} />}
      <NavControls heading={heading} onResetNorth={() => resetNorth(viewer)} onHome={goHome} onZoomIn={() => zoomBy(viewer, 0.5)} onZoomOut={() => zoomBy(viewer, 2)} />
      <button type="button" className="glass icon-btn fixed bottom-6 left-4 z-20 h-11 w-11 max-sm:left-3" aria-label="How to play" title="How to play (?)" onClick={() => setHelp(true)}>
        <Icon name="help" />
      </button>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </>
  );
}
