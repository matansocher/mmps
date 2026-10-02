import { useState } from 'react';
import { formatLatLonDecimal, formatLatLonDms } from '../lib/coordinates';
import type { LatLon } from '../types';
import { Icon } from './Icon';

export type InfoCardData = LatLon & {
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly saved: boolean;
};

type Props = {
  readonly data: InfoCardData;
  readonly onClose: () => void;
  readonly onSave?: () => void;
  readonly onFlyTo: () => void;
  readonly onCopied: () => void;
};

export function InfoCard({ data, onClose, onSave, onFlyTo, onCopied }: Props) {
  const [showDecimal, setShowDecimal] = useState(false);
  const coords = showDecimal ? formatLatLonDecimal(data, 6) : formatLatLonDms(data);
  return (
    <section
      aria-label={data.title}
      className="glass fixed z-20 overflow-hidden rounded-2xl sm:top-20 sm:right-4 sm:w-[320px] max-sm:right-2 max-sm:bottom-[76px] max-sm:left-2"
    >
      <div className="flex items-start gap-2 p-4 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-snug font-semibold break-words">{data.title}</h2>
          {data.subtitle && <p className="mt-0.5 text-sm text-white/60">{data.subtitle}</p>}
        </div>
        <button type="button" className="icon-btn -mt-1 -mr-1 h-9 w-9 shrink-0" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {data.description && <p className="scroll-thin max-h-40 overflow-y-auto px-4 pb-2 text-sm leading-relaxed whitespace-pre-line text-white/75">{data.description}</p>}
      <div className="flex items-center gap-1 px-4 pb-1 text-xs text-white/55">
        <button type="button" className="tabular-nums hover:text-white" onClick={() => setShowDecimal((v) => !v)} title="Toggle format">
          {coords}
        </button>
        <button
          type="button"
          className="icon-btn h-7 w-7"
          aria-label="Copy coordinates"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(formatLatLonDecimal(data, 6));
              onCopied();
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          <Icon name="copy" size={14} />
        </button>
      </div>
      <div className="flex gap-2 border-t border-white/10 px-3 py-2.5">
        <button type="button" className="chip flex items-center gap-1.5" onClick={onFlyTo}>
          <Icon name="target" size={16} /> Fly here
        </button>
        {onSave && (
          <button type="button" className="chip flex items-center gap-1.5" aria-pressed={data.saved} onClick={onSave} disabled={data.saved}>
            <Icon name={data.saved ? 'check' : 'bookmark'} size={16} /> {data.saved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
    </section>
  );
}
