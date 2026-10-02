import { VOYAGER_STOPS, VOYAGER_TOURS, stopById, type VoyagerStop } from '../voyager/catalog';
import type { TourState } from '../voyager/tour';
import { Drawer, SectionTitle } from './Drawer';
import { Icon } from './Icon';

type Props = {
  readonly tour: TourState | null;
  readonly onPlayTour: (stops: VoyagerStop[]) => void;
  readonly onVisit: (stop: VoyagerStop) => void;
  readonly onClose: () => void;
};

export function VoyagerPanel({ tour, onPlayTour, onVisit, onClose }: Props) {
  return (
    <Drawer title="Voyager" onClose={onClose}>
      <SectionTitle>Guided tours</SectionTitle>
      <ul className="space-y-2 px-3 pb-2">
        {VOYAGER_TOURS.map((t) => {
          const stops = t.stops.map(stopById).filter((s): s is VoyagerStop => Boolean(s));
          return (
            <li key={t.id}>
              <button type="button" onClick={() => onPlayTour(stops)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-3 text-left hover:border-white/25">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-strong)]">
                  <Icon name="play" size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.title}</span>
                  <span className="block text-xs text-white/50">
                    {stops.length} stops · {t.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <SectionTitle>Places</SectionTitle>
      <ul className="pb-3">
        {VOYAGER_STOPS.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onVisit(s)} className={`flex w-full flex-col px-4 py-2 text-left hover:bg-white/5 ${tour?.stop.id === s.id ? 'bg-white/10' : ''}`}>
              <span className="text-sm">{s.title}</span>
              <span className="text-xs text-white/45">{s.subtitle}</span>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
