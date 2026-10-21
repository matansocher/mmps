import { useEffect, useRef } from 'react';
import { ForensicDemo } from '../../demo/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { DECISION_LABEL, FEATURED_ID, LINES, TIER_LABEL, TIER_NAME, money, tierOf, type Decision, type QueueClaim } from './data.ts';

type Props = {
  readonly claim: QueueClaim;
  readonly decision?: Decision;
  readonly onClose: () => void;
  readonly onDecide: (d: Decision) => void;
};

const copy = {
  close: bi('Close claim', 'סגירת התביעה'),
  sample: bi('Preview: every row opens the same sample receipt analysis.', 'תצוגה מקדימה: כל שורה פותחת את אותו ניתוח קבלה לדוגמה.'),
  recommends: bi('Claimsight recommends', 'Claimsight ממליץ'),
  youDecide: bi('You make the call.', 'ההחלטה שלך.'),
  approve: bi('Approve payment', 'אישור תשלום'),
  refer: bi('Refer to investigations', 'העברה לחקירה'),
  score: bi('Risk score', 'ציון סיכון'),
};

export function ClaimDrawer({ claim, decision, onClose, onDecide }: Props) {
  const { t, lang } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tier = tierOf(claim.score);
  const titleId = `cs-drawer-${claim.uid}`;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    closeRef.current?.focus();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const close = () => ref.current?.close();
  const decide = (d: Decision) => {
    onDecide(d);
    close();
  };

  return (
    <dialog
      ref={ref}
      className="cs-drawer"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="cs-drawer__in">
        <header className="cs-drawer__head">
          <div className="cs-drawer__title">
            <h2 id={titleId} className="cs-mono">
              {claim.id}
            </h2>
            <p>
              {t(claim.initial)} · {t(LINES[claim.line])} · {t(claim.doc)}
            </p>
          </div>
          <div className="cs-drawer__meta">
            <span className="cs-mono cs-drawer__amt" dir="ltr">
              {money(claim.amount, lang)}
            </span>
            <span className={`cs-pill cs-pill--${tier}`}>
              <span className="sr-only">{t(copy.score)} </span>
              <span className="cs-mono">{claim.score}</span> · {t(TIER_NAME[tier])}
            </span>
          </div>
          <button ref={closeRef} type="button" className="cs-iconbtn" onClick={close} aria-label={t(copy.close)}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <kbd>Esc</kbd>
          </button>
        </header>

        <div className="cs-drawer__body">
          <ForensicDemo className="cs-fd" scenario={tier === 'clean' ? 'genuine' : 'altered'} showScenarioToggle={false} />
          {claim.id !== FEATURED_ID && <p className="cs-drawer__note">{t(copy.sample)}</p>}
        </div>

        <footer className="cs-drawer__foot">
          <p>
            <span className="cs-drawer__rec">
              {t(copy.recommends)}: <strong>{t(TIER_LABEL[tier])}</strong>
            </span>
            <span>{decision ? t(DECISION_LABEL[decision]) : t(copy.youDecide)}</span>
          </p>
          <div className="cs-drawer__actions">
            <button type="button" className={`cs-btn ${tier === 'clean' ? 'cs-btn--primary' : 'cs-btn--ghost'}`} onClick={() => decide('approved')}>
              {t(copy.approve)}
            </button>
            <button type="button" className={`cs-btn ${tier === 'clean' ? 'cs-btn--ghost' : 'cs-btn--primary'}`} onClick={() => decide('referred')}>
              {t(copy.refer)}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
