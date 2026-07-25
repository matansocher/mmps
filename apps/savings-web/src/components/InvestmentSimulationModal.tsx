import { useEffect, useMemo, useRef, useState } from 'react';
import { hasInvalidBreakdown } from '../lib/breakdown';
import type { Holding, HoldingDraft, PortfolioSettings } from '../types';
import { GEOGRAPHY_LABELS } from '../types';
import { HoldingFormFields } from './HoldingFormFields';
import { CloseIcon, PlusIcon } from './Icons';
import { SimulationPreview } from './SimulationPreview';

type InvestmentSimulationModalProps = {
  readonly holdings: readonly Holding[];
  readonly settings: PortfolioSettings;
  readonly onAdd: (holding: HoldingDraft) => void;
  readonly onClose: () => void;
};

const EMPTY_DRAFT: HoldingDraft = {
  account: 'manual',
  name: '',
  geography: GEOGRAPHY_LABELS[0],
  currentAmountIls: 0,
  targetAmountIls: 0,
  currencyExposure: 'ils',
  assetType: 'equity',
  owner: 'shared',
  note: '',
};

export function InvestmentSimulationModal({ holdings, settings, onAdd, onClose }: InvestmentSimulationModalProps) {
  const [draft, setDraft] = useState<HoldingDraft>(EMPTY_DRAFT);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const simulatedHoldings = useMemo(() => [...holdings, { id: 'investment-simulation', ...draft }], [draft, holdings]);
  const canAdd = draft.name.trim().length > 0 && draft.currentAmountIls > 0 && !hasInvalidBreakdown(draft);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function updateDraft(changes: Partial<HoldingDraft>): void {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function addInvestment(): void {
    if (!canAdd) return;
    onAdd({
      ...draft,
      name: draft.name.trim(),
      geography: draft.geography.trim(),
      note: draft.note.trim(),
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card simulation-modal" role="dialog" aria-modal="true" aria-labelledby="simulation-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">סימולציה לפני הוספה</span>
            <h2 id="simulation-title">השקעה חדשה</h2>
            <p>הגדירו את ההשקעה וראו מיד כיצד היא משנה את מבנה התיק.</p>
          </div>
          <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="סגירת חלון ההשקעה">
            <CloseIcon />
          </button>
        </header>

        <div className="modal-layout">
          <form className="investment-form" onSubmit={(event) => event.preventDefault()}>
            <HoldingFormFields idPrefix="new-investment" draft={draft} onChange={updateDraft} />
          </form>

          <SimulationPreview currentHoldings={holdings} simulatedHoldings={simulatedHoldings} settings={settings} addedAmountIls={draft.currentAmountIls} />
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            ביטול
          </button>
          <button className="primary button-with-icon" type="button" onClick={addInvestment} disabled={!canAdd}>
            <PlusIcon />
            הוספת ההשקעה לתיק
          </button>
        </footer>
      </section>
    </div>
  );
}
