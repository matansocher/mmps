import { useEffect, useRef, useState } from 'react';
import { geographyColor } from '../lib/composition';
import type { PortfolioSettings } from '../types';
import { GEOGRAPHY_LABELS } from '../types';
import { CloseIcon, SettingsIcon } from './Icons';

type InvestmentTargetsModalProps = {
  readonly settings: PortfolioSettings;
  readonly onApply: (settings: Pick<PortfolioSettings, 'fxLimitPercent' | 'solidTargetPercent' | 'geographyTargets'>) => void;
  readonly onClose: () => void;
};

function percentageValue(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function InvestmentTargetsModal({ settings, onApply, onClose }: InvestmentTargetsModalProps) {
  const hasGeographyTargets = Object.keys(settings.geographyTargets ?? {}).length > 0;
  const [fxPercent, setFxPercent] = useState(settings.fxLimitPercent);
  const [solidPercent, setSolidPercent] = useState(settings.solidTargetPercent);
  const [geoTargets, setGeoTargets] = useState<Record<string, number>>(() => {
    const equalWeight = Math.round((100 / GEOGRAPHY_LABELS.length) * 10) / 10;
    const result: Record<string, number> = {};
    for (const label of GEOGRAPHY_LABELS) {
      result[label] = settings.geographyTargets[label] ?? (hasGeographyTargets ? 0 : equalWeight);
    }
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);
    if (Math.abs(total - 100) > 0.5) {
      const lastLabel = GEOGRAPHY_LABELS[GEOGRAPHY_LABELS.length - 1];
      result[lastLabel] = Math.round(Math.max(0, 100 - (total - result[lastLabel])) * 10) / 10;
    }
    return result;
  });
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const geoTotal = Math.round(Object.values(geoTargets).reduce((sum, v) => sum + v, 0) * 10) / 10;
  const geoIsValid = Math.abs(geoTotal - 100) < 0.5;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleGeoChange(label: string, rawValue: number): void {
    setGeoTargets((current) => ({ ...current, [label]: percentageValue(rawValue) }));
  }

  function equalSplit(): void {
    const base = Math.floor((100 / GEOGRAPHY_LABELS.length) * 10) / 10;
    const result: Record<string, number> = {};
    let allocated = 0;
    GEOGRAPHY_LABELS.forEach((label, index) => {
      if (index === GEOGRAPHY_LABELS.length - 1) {
        result[label] = Math.round((100 - allocated) * 10) / 10;
      } else {
        result[label] = base;
        allocated += base;
      }
    });
    setGeoTargets(result);
  }

  function applyTargets(): void {
    onApply({
      fxLimitPercent: percentageValue(fxPercent),
      solidTargetPercent: percentageValue(solidPercent),
      geographyTargets: Object.fromEntries(Object.entries(geoTargets).map(([k, v]) => [k, percentageValue(v)])),
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card targets-modal" role="dialog" aria-modal="true" aria-labelledby="targets-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">הגדרות אסטרטגיה</span>
            <h2 id="targets-title">יעדי השקעה</h2>
            <p>הגדירו את יעדי חלוקת התיק לפי מטבע, סוג נכס ואזור גיאוגרפי.</p>
          </div>
          <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="סגירת חלון יעדי ההשקעה">
            <CloseIcon />
          </button>
        </header>

        <div className="target-limits">
          <div className="target-pair-block">
            <span className="target-pair-title">מטבע</span>
            <div className="target-pair-inputs">
              <label className="target-pair-field">
                <span>מט״ח</span>
                <div className="input-with-unit target-percent-input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={fxPercent || ''}
                    onChange={(e) => setFxPercent(percentageValue(e.target.valueAsNumber))}
                  />
                  <span>%</span>
                </div>
              </label>
              <label className="target-pair-field target-pair-complement">
                <span>שקלי</span>
                <div className="input-with-unit target-percent-input">
                  <input type="number" readOnly value={100 - fxPercent} tabIndex={-1} />
                  <span>%</span>
                </div>
              </label>
            </div>
          </div>
          <div className="target-pair-block">
            <span className="target-pair-title">סוג נכס</span>
            <div className="target-pair-inputs">
              <label className="target-pair-field">
                <span>סולידי</span>
                <div className="input-with-unit target-percent-input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={solidPercent || ''}
                    onChange={(e) => setSolidPercent(percentageValue(e.target.valueAsNumber))}
                  />
                  <span>%</span>
                </div>
              </label>
              <label className="target-pair-field target-pair-complement">
                <span>מנייתי</span>
                <div className="input-with-unit target-percent-input">
                  <input type="number" readOnly value={100 - solidPercent} tabIndex={-1} />
                  <span>%</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="targets-heading">
          <div>
            <h3>יעדי אזור גיאוגרפי</h3>
            <p>הגדירו את אחוז היעד לכל אזור. הסכום צריך להגיע ל-100%.</p>
          </div>
          <button type="button" className="target-equal-btn" onClick={equalSplit}>
            חלוקה שווה
          </button>
        </div>

        <div className="target-geo-section">
          <div className="target-geo-grid">
            {GEOGRAPHY_LABELS.map((label, index) => (
              <label className="target-geo-field" key={label}>
                <span className="target-geo-label">
                  <span className="target-geo-dot" style={{ background: geographyColor(index) }} />
                  {label}
                </span>
                <div className="input-with-unit target-percent-input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={geoTargets[label] || ''}
                    onChange={(e) => handleGeoChange(label, e.target.valueAsNumber)}
                  />
                  <span>%</span>
                </div>
              </label>
            ))}
          </div>
          <div className={`target-geo-total${geoIsValid ? '' : ' is-error'}`}>
            סה״כ {geoTotal.toFixed(1)}%
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            ביטול
          </button>
          <button className="primary button-with-icon" type="button" onClick={applyTargets} disabled={!geoIsValid}>
            <SettingsIcon />
            החלת היעדים
          </button>
        </footer>
      </section>
    </div>
  );
}
