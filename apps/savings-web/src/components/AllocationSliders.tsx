import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useRef } from 'react';

type SplitRangeSliderProps = {
  readonly id: string;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly leftColor: string;
  readonly rightColor: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
};

function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function SplitRangeSlider({ id, leftLabel, rightLabel, leftColor, rightColor, value, onChange }: SplitRangeSliderProps) {
  const safeValue = clampPercent(value);

  return (
    <div className="split-slider">
      <div className="split-slider-track" dir="ltr" style={{ background: `linear-gradient(to right, ${leftColor} 0%, ${leftColor} ${safeValue}%, ${rightColor} ${safeValue}%, ${rightColor} 100%)` }}>
        <input
          id={id}
          name={id}
          className="split-slider-input"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={safeValue}
          onChange={(event) => onChange(clampPercent(Number(event.target.value)))}
          aria-label={`${leftLabel} מול ${rightLabel}`}
        />
      </div>
      <div className="split-slider-legend">
        <span className="split-slider-legend-item">
          <span className="split-slider-dot" style={{ background: leftColor }} />
          {leftLabel} <strong>{safeValue.toFixed(1)}%</strong>
        </span>
        <span className="split-slider-legend-item">
          <span className="split-slider-dot" style={{ background: rightColor }} />
          {rightLabel} <strong>{(100 - safeValue).toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
}

export type StackedAllocationSegment = {
  readonly key: string;
  readonly label: string;
  readonly percent: number;
  readonly color: string;
};

type StackedAllocationSliderProps = {
  readonly segments: readonly StackedAllocationSegment[];
  readonly onChange: (updates: ReadonlyMap<string, number>) => void;
};

const MIN_SEGMENT_PERCENT = 1;

function clampBoundary(index: number, value: number, boundaries: readonly number[]): number {
  const lower = (index > 0 ? boundaries[index - 1] : 0) + MIN_SEGMENT_PERCENT;
  const upper = (index < boundaries.length - 1 ? boundaries[index + 1] : 100) - MIN_SEGMENT_PERCENT;
  return Math.min(upper, Math.max(lower, value));
}

export function StackedAllocationSlider({ segments, onChange }: StackedAllocationSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ readonly index: number; readonly startX: number; readonly boundaries: readonly number[] } | null>(null);

  const boundaries = useMemo(() => {
    let cumulative = 0;
    return segments.slice(0, -1).map((segment) => {
      cumulative += segment.percent;
      return cumulative;
    });
  }, [segments]);

  const starts = useMemo(() => [0, ...boundaries], [boundaries]);

  function applyBoundaries(nextBoundaries: readonly number[]): void {
    const updates = new Map<string, number>();
    let previous = 0;
    segments.forEach((segment, index) => {
      const boundary = index < nextBoundaries.length ? nextBoundaries[index] : 100;
      updates.set(segment.key, Math.round((boundary - previous) * 10) / 10);
      previous = boundary;
    });
    onChange(updates);
  }

  function handlePointerDown(index: number) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragState.current = { index, startX: event.clientX, boundaries };
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragState.current;
    const container = containerRef.current;
    if (!state || !container) return;
    const rect = container.getBoundingClientRect();
    const deltaPercent = ((event.clientX - state.startX) / rect.width) * 100;
    const nextBoundaries = [...state.boundaries];
    nextBoundaries[state.index] = clampBoundary(state.index, state.boundaries[state.index] + deltaPercent, state.boundaries);
    applyBoundaries(nextBoundaries);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current = null;
  }

  function handleKeyDown(index: number) {
    return (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? 5 : 1;
      const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (direction === 0) return;
      event.preventDefault();
      const nextBoundaries = [...boundaries];
      nextBoundaries[index] = clampBoundary(index, boundaries[index] + direction * step, boundaries);
      applyBoundaries(nextBoundaries);
    };
  }

  if (segments.length === 0) return null;

  return (
    <div className="stacked-slider">
      <div className="stacked-slider-track" ref={containerRef} dir="ltr">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            className="stacked-slider-segment"
            style={{ insetInlineStart: `${starts[index]}%`, inlineSize: `${segment.percent}%`, background: segment.color }}
          />
        ))}
        {boundaries.map((boundary, index) => (
          <button
            key={`divider-${index}`}
            type="button"
            className="stacked-slider-divider"
            style={{ insetInlineStart: `${boundary}%` }}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(boundary * 10) / 10}
            aria-label={`גבול בין ${segments[index].label} ל־${segments[index + 1].label}`}
            onPointerDown={handlePointerDown(index)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown(index)}
          />
        ))}
      </div>
      <ul className="stacked-slider-legend">
        {segments.map((segment) => (
          <li className="stacked-slider-legend-item" key={segment.key}>
            <span className="stacked-slider-dot" style={{ background: segment.color }} />
            <span className="cell-ellipsis" title={segment.label}>
              {segment.label}
            </span>
            <strong>{segment.percent.toFixed(1)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
