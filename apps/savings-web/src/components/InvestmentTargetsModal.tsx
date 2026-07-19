import { useEffect, useMemo, useRef, useState } from 'react';
import { distinctGeographyLabels, geographyColor } from '../lib/composition';
import type { Holding, PortfolioSettings } from '../types';
import { SplitRangeSlider, StackedAllocationSlider } from './AllocationSliders';
import { CloseIcon, SettingsIcon } from './Icons';

type InvestmentTargetsModalProps = {
  readonly holdings: readonly Holding[];
  readonly settings: PortfolioSettings;
  readonly onApply: (settings: Pick<PortfolioSettings, 'fxLimitPercent' | 'solidTargetPercent' | 'geographyTargets'>) => void;
  readonly onClose: () => void;
};

function percentageValue(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

function normalizeWeightEntries(entries: readonly (readonly [string, number])[]): ReadonlyMap<string, number> {
  const total = entries.reduce((sum, [, value]) => sum + percentageValue(value), 0);
  if (total <= 0) return new Map(entries);
  let allocated = 0;
  return new Map(
    entries.map(([id, value], index) => {
      const normalized = index === entries.length - 1 ? Math.max(0, 100 - allocated) : Math.round((percentageValue(value) / total) * 1000) / 10;
      allocated += normalized;
      return [id, normalized] as const;
    }),
  );
}

export function InvestmentTargetsModal({ holdings, settings, onApply, onClose }: InvestmentTargetsModalProps) {
  const geographyLabels = useMemo(() => distinctGeographyLabels(holdings), [holdings]);
  const equalGeographyWeight = geographyLabels.length > 0 ? 100 / geographyLabels.length : 0;
  const [fxPercent, setFxPercent] = useState(settings.fxLimitPercent);
  const [solidPercent, setSolidPercent] = useState(settings.solidTargetPercent);
  const [geographyTargets, setGeographyTargets] = useState<ReadonlyMap<string, number>>(() =>
    normalizeWeightEntries(geographyLabels.map((label) => [label, settings.geographyTargets[label] ?? equalGeographyWeight])),
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const geographySegments = useMemo(
    () =>
      geographyLabels.map((label, index) => ({
        key: label,
        label,
        percent: geographyTargets.get(label) ?? 0,
        color: geographyColor(index),
      })),
    [geographyLabels, geographyTargets],
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function applyTargets(): void {
    onApply({
      fxLimitPercent: percentageValue(fxPercent),
      solidTargetPercent: percentageValue(solidPercent),
      geographyTargets: Object.fromEntries(geographyTargets),
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
            <p>גררו את הבקרים כדי לקבוע לאן שואפים להטות את התיק.</p>
          </div>
          <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="סגירת חלון יעדי ההשקעה">
            <CloseIcon />
          </button>
        </header>

        <div className="target-limits">
          <div className="target-slider-block">
            <span className="target-slider-title">מטבע</span>
            <SplitRangeSlider id="target-fx-limit" leftLabel="מט״ח" rightLabel="שקלי" leftColor="#176b73" rightColor="#c7d2da" value={fxPercent} onChange={setFxPercent} />
          </div>
          <div className="target-slider-block">
            <span className="target-slider-title">סוג נכס</span>
            <SplitRangeSlider id="target-solid-allocation" leftLabel="סולידי" rightLabel="מנייתי" leftColor="#b17b16" rightColor="#4767a8" value={solidPercent} onChange={setSolidPercent} />
          </div>
        </div>

        <div className="targets-heading">
          <div>
            <h3>יעדי אזור גיאוגרפי</h3>
            <p>גררו את הקווים המפרידים בין האזורים כדי לשנות את היעד של כל אחד מהם.</p>
          </div>
        </div>

        {geographySegments.length === 0 ? (
          <div className="empty-content compact">
            <strong>אין עדיין נתוני אזור</strong>
            <span>לאחר הוספת השקעות עם אזור גיאוגרפי ניתן יהיה להגדיר יעדים לכל אזור.</span>
          </div>
        ) : (
          <StackedAllocationSlider segments={geographySegments} onChange={setGeographyTargets} />
        )}

        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            ביטול
          </button>
          <button className="primary button-with-icon" type="button" onClick={applyTargets}>
            <SettingsIcon />
            החלת היעדים
          </button>
        </footer>
      </section>
    </div>
  );
}
