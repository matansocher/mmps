import { useEffect, useMemo, useRef, useState } from 'react';
import { hasBreakdown } from '../lib/breakdown';
import { rankCandidates } from '../lib/allocationAdvisor';
import { formatIls } from '../lib/format';
import type { Holding, PortfolioSettings } from '../types';
import { CloseIcon, LightbulbIcon } from './Icons';
import { SimulationPreview } from './SimulationPreview';

type DepositAdvisorModalProps = {
  readonly holdings: readonly Holding[];
  readonly settings: PortfolioSettings;
  readonly onApply: (id: string, nextAmountIls: number) => void;
  readonly onClose: () => void;
};

const CURRENCY_LABEL: Readonly<Record<Holding['currencyExposure'], string>> = { fx: 'מט״ח', ils: 'שקלי' };
const ASSET_TYPE_LABEL: Readonly<Record<Holding['assetType'], string>> = { solid: 'סולידי', equity: 'מנייתי' };

export function DepositAdvisorModal({ holdings, settings, onApply, onClose }: DepositAdvisorModalProps) {
  const [amountIls, setAmountIls] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const candidates = useMemo(() => rankCandidates(holdings, settings, amountIls, 3), [holdings, settings, amountIls]);
  const selectedCandidate = candidates.find((candidate) => candidate.holding.id === selectedId) ?? candidates[0] ?? null;

  useEffect(() => {
    if (candidates.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!candidates.some((candidate) => candidate.holding.id === selectedId)) setSelectedId(candidates[0].holding.id);
  }, [candidates, selectedId]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const simulatedHoldings = useMemo(
    () => (selectedCandidate ? holdings.map((holding) => (holding.id === selectedCandidate.holding.id ? { ...holding, currentAmountIls: holding.currentAmountIls + amountIls } : holding)) : holdings),
    [holdings, selectedCandidate, amountIls],
  );

  const canApply = amountIls > 0 && selectedCandidate !== null;

  function applyDeposit(): void {
    if (!selectedCandidate) return;
    onApply(selectedCandidate.holding.id, selectedCandidate.holding.currentAmountIls + amountIls);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card advisor-modal" role="dialog" aria-modal="true" aria-labelledby="advisor-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">סימולציית הפקדה</span>
            <h2 id="advisor-title">יעוץ הפקדה</h2>
            <p>הזינו סכום ונמליץ להיכן להוסיף אותו כדי להתקרב ליעדי ההשקעה שהגדרתם.</p>
          </div>
          <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="סגירת חלון יעוץ ההפקדה">
            <CloseIcon />
          </button>
        </header>

        <div className="modal-layout">
          <div className="advisor-panel">
            <label className="advisor-amount-field" htmlFor="advisor-amount">
              <span>כמה כסף תרצו להוסיף?</span>
              <input
                id="advisor-amount"
                type="number"
                min={0}
                step={100}
                value={amountIls || ''}
                placeholder="לדוגמה 50000"
                onChange={(event) => setAmountIls(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>

            {amountIls <= 0 ? (
              <div className="empty-content compact">
                <strong>הזינו סכום</strong>
                <span>לאחר הזנת סכום נציג את שלושת ההשקעות שהכי יקרבו את התיק ליעדים.</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="empty-content compact">
                <strong>אין השקעות להצגה</strong>
                <span>ההמלצות ניתנות רק להשקעות שחלקן בתיק מוגדר כ״ידני״. יש להוסיף השקעה כזו לפני שימוש ביעוץ ההפקדה.</span>
              </div>
            ) : (
              <ul className="advisor-candidate-list">
                {candidates.map((candidate, index) => (
                  <li key={candidate.holding.id}>
                    <button
                      type="button"
                      className={`advisor-candidate${candidate.holding.id === selectedCandidate?.holding.id ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(candidate.holding.id)}
                      aria-pressed={candidate.holding.id === selectedCandidate?.holding.id}
                    >
                      <span className="advisor-rank-badge">{index + 1}</span>
                      <span className="advisor-candidate-body">
                        <span className="advisor-candidate-name">{candidate.holding.name}</span>
                        <span className="advisor-candidate-tags">
                          <span className="tag">{CURRENCY_LABEL[candidate.holding.currencyExposure]}{hasBreakdown(candidate.holding, 'currency') ? ' (פיצול)' : ''}</span>
                          <span className="tag">{ASSET_TYPE_LABEL[candidate.holding.assetType]}{hasBreakdown(candidate.holding, 'asset') ? ' (פיצול)' : ''}</span>
                          {candidate.holding.geography ? <span className="tag">{candidate.holding.geography}{hasBreakdown(candidate.holding, 'geography') ? ' (פיצול)' : ''}</span> : null}
                        </span>
                        <span className="advisor-explanation">{candidate.explanation}</span>
                      </span>
                      <span className="advisor-score">{formatIls(candidate.holding.currentAmountIls + amountIls)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SimulationPreview currentHoldings={holdings} simulatedHoldings={simulatedHoldings} settings={settings} addedAmountIls={amountIls} />
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            ביטול
          </button>
          <button className="primary button-with-icon" type="button" onClick={applyDeposit} disabled={!canApply}>
            <LightbulbIcon />
            הוספת הסכום להשקעה שנבחרה
          </button>
        </footer>
      </section>
    </div>
  );
}
