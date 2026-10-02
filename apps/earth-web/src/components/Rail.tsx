import type { IconName } from './Icon';
import { Icon } from './Icon';

export type PanelId = 'voyager' | 'places' | 'layers' | 'measure';

type RailButton = { readonly id: string; readonly icon: IconName; readonly label: string; readonly pressed?: boolean; readonly onClick: () => void; readonly desktopOnly?: boolean };

type Props = {
  readonly panel: PanelId | null;
  readonly onPanel: (panel: PanelId) => void;
  readonly onLucky: () => void;
  readonly onScreenshot: () => void;
  readonly onShare: () => void;
  readonly onFullscreen: () => void;
  readonly fullscreen: boolean;
  readonly onHelp: () => void;
};

export function Rail({ panel, onPanel, onLucky, onScreenshot, onShare, onFullscreen, fullscreen, onHelp }: Props) {
  const primary: RailButton[] = [
    { id: 'voyager', icon: 'voyager', label: 'Voyager', pressed: panel === 'voyager', onClick: () => onPanel('voyager') },
    { id: 'lucky', icon: 'dice', label: 'I’m feeling lucky', onClick: onLucky },
    { id: 'places', icon: 'bookmark', label: 'My places', pressed: panel === 'places', onClick: () => onPanel('places') },
    { id: 'layers', icon: 'layers', label: 'Map style', pressed: panel === 'layers', onClick: () => onPanel('layers') },
    { id: 'measure', icon: 'ruler', label: 'Measure', pressed: panel === 'measure', onClick: () => onPanel('measure') },
  ];
  const secondary: RailButton[] = [
    { id: 'screenshot', icon: 'camera', label: 'Screenshot', onClick: onScreenshot },
    { id: 'share', icon: 'share', label: 'Copy link to this view', onClick: onShare },
    { id: 'fullscreen', icon: fullscreen ? 'fullscreenExit' : 'fullscreen', label: fullscreen ? 'Exit full screen' : 'Full screen', onClick: onFullscreen, desktopOnly: true },
    { id: 'help', icon: 'help', label: 'Keyboard shortcuts', onClick: onHelp, desktopOnly: true },
  ];

  const render = (b: RailButton) => (
    <button
      key={b.id}
      type="button"
      className={`icon-btn group relative h-11 w-11 ${b.desktopOnly ? 'max-sm:hidden' : ''}`}
      aria-label={b.label}
      aria-pressed={b.pressed === undefined ? undefined : b.pressed}
      onClick={b.onClick}
    >
      <Icon name={b.icon} />
      <span className="pointer-events-none absolute left-full ml-3 rounded-md bg-black/85 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 max-sm:hidden">
        {b.label}
      </span>
    </button>
  );

  return (
    <nav
      aria-label="Tools"
      className="glass fixed z-30 flex items-center gap-1 rounded-full p-1 sm:top-4 sm:left-4 sm:flex-col max-sm:right-3 max-sm:bottom-[max(12px,env(safe-area-inset-bottom))] max-sm:left-3 max-sm:justify-around"
    >
      {primary.map(render)}
      <div className="mx-1 h-6 w-px bg-white/10 sm:mx-0 sm:my-1 sm:h-px sm:w-6" />
      {secondary.map(render)}
    </nav>
  );
}
