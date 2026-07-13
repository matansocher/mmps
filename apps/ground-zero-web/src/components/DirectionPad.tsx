import type { Direction } from '../game';

type DirectionPadProps = {
  readonly onDirectionStart: (direction: Direction) => void;
  readonly onDirectionEnd: () => void;
};

const ARROWS: Readonly<Record<Direction, string>> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
};

export function DirectionPad({ onDirectionStart, onDirectionEnd }: DirectionPadProps) {
  return (
    <div className="direction-pad" aria-label="Movement controls">
      {(['up', 'left', 'down', 'right'] as const).map((direction) => (
        <button
          key={direction}
          className={`direction-button direction-${direction}`}
          type="button"
          aria-label={`Move ${direction}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            onDirectionStart(direction);
          }}
          onPointerUp={onDirectionEnd}
          onPointerCancel={onDirectionEnd}
          onPointerLeave={onDirectionEnd}
        >
          {ARROWS[direction]}
        </button>
      ))}
    </div>
  );
}
