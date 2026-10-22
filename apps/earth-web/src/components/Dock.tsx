import { Icon } from './Icon';

type Props = {
  readonly heading: number;
  readonly sound: boolean;
  readonly onResetNorth: () => void;
  readonly onHome: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onToggleSound: () => void;
  readonly onHelp: () => void;
};

// One vertical rail for every globe and app control; lifts above bottom sheets via --sheet-h.
export function Dock({ heading, sound, onResetNorth, onHome, onZoomIn, onZoomOut, onToggleSound, onHelp }: Props) {
  return (
    <nav className="panel dock fixed right-3 z-20 flex flex-col items-center rounded-[16px] p-1 transition-[bottom] duration-300 sm:right-4" aria-label="Globe controls">
      <button type="button" className="icon-btn dock-btn" aria-label="Show the whole globe" data-tip="Whole globe · R" onClick={onHome}>
        <Icon name="globe" />
      </button>
      <button type="button" className="icon-btn dock-btn" aria-label="Reset to north" data-tip="North up · N" onClick={onResetNorth}>
        <svg width="24" height="24" viewBox="0 0 26 26" style={{ transform: `rotate(${-heading}deg)` }} className="transition-transform duration-75" aria-hidden="true">
          <path d="M13 2 17 13H9z" fill="var(--color-accent)" />
          <path d="M13 24 9 13h8z" fill="#ffffff" />
        </svg>
      </button>
      <button type="button" className="icon-btn dock-btn max-sm:hidden" aria-label="Zoom in" data-tip="Zoom in · +" onClick={onZoomIn}>
        <Icon name="plus" />
      </button>
      <button type="button" className="icon-btn dock-btn max-sm:hidden" aria-label="Zoom out" data-tip="Zoom out · −" onClick={onZoomOut}>
        <Icon name="minus" />
      </button>
      <div className="my-1 h-px w-7 bg-[var(--color-rule)]" aria-hidden="true" />
      <button type="button" className="icon-btn dock-btn" aria-label="Sound effects" aria-pressed={sound} data-tip={sound ? 'Mute' : 'Sound on'} onClick={onToggleSound}>
        <Icon name={sound ? 'volume' : 'mute'} />
      </button>
      <button type="button" className="icon-btn dock-btn" aria-label="How to play" data-tip="How to play · ?" onClick={onHelp}>
        <Icon name="help" />
      </button>
    </nav>
  );
}
