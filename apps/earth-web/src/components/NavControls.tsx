import { Icon } from './Icon';

type Props = {
  readonly heading: number;
  readonly raised: boolean; // Sits above the mobile departures sheet
  readonly onResetNorth: () => void;
  readonly onHome: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
};

export function NavControls({ raised, heading, onResetNorth, onHome, onZoomIn, onZoomOut }: Props) {
  return (
    <div className={`fixed right-4 bottom-6 z-20 flex flex-col items-center gap-2 max-sm:right-3 ${raised ? 'max-sm:bottom-[calc(64dvh+12px)]' : ''}`}>
      <button type="button" className="panel icon-btn" aria-label="Show the whole globe" title="Whole globe (R)" onClick={onHome}>
        <Icon name="globe" />
      </button>
      <button type="button" className="panel icon-btn" aria-label="Reset to north" title="Reset to north (N)" onClick={onResetNorth}>
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ transform: `rotate(${-heading}deg)` }} className="transition-transform duration-75" aria-hidden="true">
          <path d="M13 2 17 13H9z" fill="#3b82f6" />
          <path d="M13 24 9 13h8z" fill="#ffffff" />
        </svg>
      </button>
      <div className="panel flex flex-col overflow-hidden rounded-[10px] max-sm:hidden">
        <button type="button" className="icon-btn rounded-none border-0 bg-transparent" aria-label="Zoom in" title="Zoom in (+)" onClick={onZoomIn}>
          <Icon name="plus" />
        </button>
        <div className="mx-2.5 h-px bg-[var(--color-rule)]" />
        <button type="button" className="icon-btn rounded-none border-0 bg-transparent" aria-label="Zoom out" title="Zoom out (−)" onClick={onZoomOut}>
          <Icon name="minus" />
        </button>
      </div>
    </div>
  );
}
