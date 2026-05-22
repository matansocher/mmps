import { conditionEmoji } from '../lib/weather';
import type { WeatherSnapshot } from '../types';

type Props = { readonly weather: WeatherSnapshot };

export function WeatherCard({ weather }: Props) {
  const { now, tomorrow } = weather;

  if (!now && !tomorrow) {
    return (
      <div className="rounded-2xl bg-bg-card border border-border-subtle p-4 text-text-secondary text-sm">
        Weather unavailable
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-4xl leading-none">{now ? conditionEmoji(now.conditionCode) : '—'}</div>
          <div>
            <div className="text-3xl font-semibold tabular">{now ? `${Math.round(now.tempC)}°` : '—'}</div>
            <div className="text-xs text-text-secondary">{now?.condition ?? ''}</div>
          </div>
        </div>
        <div className="text-right text-xs text-text-secondary">
          <div>{now?.location ?? ''}</div>
          {now && <div className="mt-0.5">Feels {Math.round(now.feelsLike)}°</div>}
        </div>
      </div>
      {tomorrow && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-xs uppercase tracking-wide">Tomorrow</span>
            <span>{conditionEmoji(tomorrow.conditionCode)}</span>
            <span className="text-text-secondary">{tomorrow.condition}</span>
          </div>
          <div className="flex items-center gap-3 tabular">
            <span className="text-text-primary">{Math.round(tomorrow.high)}°</span>
            <span className="text-text-muted">{Math.round(tomorrow.low)}°</span>
            {tomorrow.chanceOfRain > 0 && (
              <span className="text-accent-primary text-xs">💧 {tomorrow.chanceOfRain}%</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
