import { useEffect } from 'react';
import { openExternal } from '../lib/telegram';
import { CityPicker } from './CityPicker';

const CONTACT_USERNAME = 'daninave1';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly cities: ReadonlyArray<string>;
  readonly city: string | null;
  readonly onCityChange: (city: string | null) => void;
};

export function SettingsSheet({ open, onClose, cities, city, onCityChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-bg-base border-t border-border-subtle rounded-t-2xl px-4 pt-3 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-border-subtle" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">הגדרות</h2>
          <button onClick={onClose} className="text-text-muted text-xl leading-none" aria-label="close">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary font-medium">העיר שלי</label>
          <CityPicker cities={cities} value={city} onChange={onCityChange} />
          <p className="text-xs text-text-muted leading-relaxed">
            נשתמש בעיר כדי להציג לך קודם תוצאות רלוונטיות מהאזור שלך.
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-border-subtle">
          <button
            onClick={() => openExternal(`https://t.me/${CONTACT_USERNAME}`)}
            className="w-full flex items-center justify-between bg-bg-card border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary"
          >
            <span>📬 צור קשר</span>
            <span className="text-text-muted text-xs">פתח בטלגרם ←</span>
          </button>
        </div>
      </div>
    </div>
  );
}
