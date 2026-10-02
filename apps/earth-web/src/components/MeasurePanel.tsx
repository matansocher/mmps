import { formatArea, formatDistance } from '../lib/format';
import type { MeasureMode, MeasureResult } from '../tools/measure';
import type { Units } from '../types';
import { Drawer } from './Drawer';
import { Icon } from './Icon';

type Props = {
  readonly result: MeasureResult | null;
  readonly units: Units;
  readonly onMode: (mode: MeasureMode) => void;
  readonly onUndo: () => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
};

export function MeasurePanel({ result, units, onMode, onUndo, onClear, onClose }: Props) {
  const mode = result?.mode ?? 'line';
  return (
    <Drawer title="Measure" onClose={onClose}>
      <div className="flex gap-2 px-4 pt-4">
        <button type="button" className="chip" aria-pressed={mode === 'line'} onClick={() => onMode('line')}>
          Distance
        </button>
        <button type="button" className="chip" aria-pressed={mode === 'area'} onClick={() => onMode('area')}>
          Area
        </button>
      </div>
      <div className="px-4 py-5">
        {mode === 'area' ? (
          <>
            <div className="text-xs text-white/50">Area</div>
            <div className="text-2xl font-semibold tabular-nums">{formatArea(result?.area ?? 0, units)}</div>
            <div className="mt-3 text-xs text-white/50">Perimeter</div>
            <div className="text-lg tabular-nums">{formatDistance(result?.distance ?? 0, units)}</div>
          </>
        ) : (
          <>
            <div className="text-xs text-white/50">Distance</div>
            <div className="text-2xl font-semibold tabular-nums">{formatDistance(result?.distance ?? 0, units)}</div>
          </>
        )}
        <div className="mt-3 text-xs text-white/45">{result?.points ?? 0} points</div>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <button type="button" className="chip flex items-center gap-1.5" disabled={!result?.points} onClick={onUndo}>
          <Icon name="undo" size={16} /> Undo
        </button>
        <button type="button" className="chip flex items-center gap-1.5" disabled={!result?.points} onClick={onClear}>
          <Icon name="trash" size={16} /> Clear
        </button>
      </div>
      <p className="px-4 pb-4 text-xs leading-relaxed text-white/45">Click on the map to add points. Right-click removes the last point. Drag still moves the globe.</p>
    </Drawer>
  );
}
