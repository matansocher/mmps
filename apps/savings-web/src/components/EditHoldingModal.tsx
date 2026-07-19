import { useEffect, useMemo, useRef, useState } from 'react';
import type { Holding, HoldingDraft, PortfolioSettings } from '../types';
import { HoldingFormFields } from './HoldingFormFields';
import { CloseIcon, SaveIcon, TrashIcon } from './Icons';
import { SimulationPreview } from './SimulationPreview';

type EditHoldingModalProps = {
  readonly holding: Holding;
  readonly holdings: readonly Holding[];
  readonly settings: PortfolioSettings;
  readonly onSave: (id: string, changes: HoldingDraft) => void;
  readonly onDelete: (id: string) => void;
  readonly onClose: () => void;
};

function draftFromHolding(holding: Holding): HoldingDraft {
  return {
    account: holding.account,
    name: holding.name,
    category: holding.category,
    geography: holding.geography,
    currentAmountIls: holding.currentAmountIls,
    targetAmountIls: holding.targetAmountIls,
    currencyExposure: holding.currencyExposure,
    assetType: holding.assetType,
    owner: holding.owner,
    note: holding.note,
  };
}

export function EditHoldingModal({ holding, holdings, settings, onSave, onDelete, onClose }: EditHoldingModalProps) {
  const [draft, setDraft] = useState<HoldingDraft>(() => draftFromHolding(holding));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const simulatedHoldings = useMemo(() => holdings.map((item) => (item.id === holding.id ? { ...item, ...draft } : item)), [holdings, holding.id, draft]);
  const addedAmountIls = draft.currentAmountIls - holding.currentAmountIls;
  const canSave = draft.name.trim().length > 0;

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

  function saveChanges(): void {
    if (!canSave) return;
    onSave(holding.id, {
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      geography: draft.geography.trim(),
      note: draft.note.trim(),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card simulation-modal" role="dialog" aria-modal="true" aria-labelledby="edit-holding-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">עריכת השקעה</span>
            <h2 id="edit-holding-title">{holding.name || 'השקעה'}</h2>
            <p>עדכנו את פרטי ההשקעה וראו מיד כיצד זה משפיע על מבנה התיק.</p>
          </div>
          <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="סגירת חלון עריכת ההשקעה">
            <CloseIcon />
          </button>
        </header>

        <div className="modal-layout">
          <form className="investment-form" onSubmit={(event) => event.preventDefault()}>
            <HoldingFormFields idPrefix={`edit-holding-${holding.id}`} draft={draft} onChange={updateDraft} />
          </form>

          <SimulationPreview currentHoldings={holdings} simulatedHoldings={simulatedHoldings} settings={settings} addedAmountIls={addedAmountIls} />
        </div>

        <footer className="modal-footer">
          <button className="danger button-with-icon modal-footer-start" type="button" onClick={() => onDelete(holding.id)}>
            <TrashIcon />
            מחיקת ההשקעה
          </button>
          <button type="button" onClick={onClose}>
            ביטול
          </button>
          <button className="primary button-with-icon" type="button" onClick={saveChanges} disabled={!canSave}>
            <SaveIcon />
            שמירת השינויים
          </button>
        </footer>
      </section>
    </div>
  );
}
