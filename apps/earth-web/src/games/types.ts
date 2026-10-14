import type { GameMode } from '../game/modes';
import type { EarthEngine } from '../globe/engine';

export type GameProps<M extends GameMode = GameMode> = {
  readonly engine: EarthEngine;
  readonly mode: M;
  readonly onChangeMode: () => void;
};
