import { Icon } from './Icon';

type Props = {
  readonly heading: number;
  readonly pitch: number;
  readonly onResetNorth: () => void;
  readonly onToggleTilt: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onMyLocation: () => void;
  readonly locating: boolean;
};

export function NavControls({ heading, pitch, onResetNorth, onToggleTilt, onZoomIn, onZoomOut, onMyLocation, locating }: Props) {
  const tilted = pitch > -80;
  return (
    <div className="fixed right-4 z-20 flex flex-col items-center gap-2 sm:bottom-12 max-sm:top-20 max-sm:right-3">
      <button type="button" className="glass icon-btn h-11 w-11" aria-label="Show your location" onClick={onMyLocation}>
        {locating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-accent)]" /> : <Icon name="myLocation" />}
      </button>
      <button type="button" className="glass icon-btn h-11 w-11 text-[13px] font-semibold" aria-label={tilted ? 'Switch to top-down view' : 'Tilt to 3D view'} aria-pressed={tilted} onClick={onToggleTilt}>
        {tilted ? '2D' : '3D'}
      </button>
      <button type="button" className="glass icon-btn h-11 w-11" aria-label="Reset to north" title="Reset to north (N)" onClick={onResetNorth}>
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ transform: `rotate(${-heading}deg)` }} className="transition-transform duration-75" aria-hidden="true">
          <path d="M13 2 17 13H9z" fill="#ea4335" />
          <path d="M13 24 9 13h8z" fill="#e8eaed" />
        </svg>
      </button>
      <div className="glass flex flex-col overflow-hidden rounded-full max-sm:hidden">
        <button type="button" className="icon-btn h-10 w-11 rounded-none" aria-label="Zoom in" onClick={onZoomIn}>
          <Icon name="plus" />
        </button>
        <div className="mx-2.5 h-px bg-white/10" />
        <button type="button" className="icon-btn h-10 w-11 rounded-none" aria-label="Zoom out" onClick={onZoomOut}>
          <Icon name="minus" />
        </button>
      </div>
    </div>
  );
}
