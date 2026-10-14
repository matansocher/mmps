import type { CSSProperties, MouseEvent } from 'react';
import { bi, useLang } from '../../lib/i18n.tsx';

const SIZE = 10;
const FLAGGED_ROW = 9;
const FLAGGED_COL = 6;
const FLAGGED = FLAGGED_ROW * SIZE + FLAGGED_COL;

const copy = {
  label: bi('100 incoming claims: 99 paid today, 1 held for review', '100 תביעות נכנסות: 99 שולמו היום, 1 מעוכבת לבדיקה'),
  held: bi('Held for review', 'מעוכבת לבדיקה'),
  edited: bi('Receipt edited: $450 → $1,450', 'סכום הקבלה שונה מ-\u20aa450 ל-\u20aa1,450'),
  see: bi('See how we caught it', 'איך זה התגלה'),
  paid: bi('paid today', 'שולמו היום'),
  review: bi('held for review', 'מעוכבת לבדיקה'),
  caption: bi('Illustration: 100 incoming claims', 'להמחשה: 100 תביעות נכנסות'),
};

type Props = { readonly onOpen: (e: MouseEvent<HTMLAnchorElement>) => void };

export function ClaimGrid({ onOpen }: Props) {
  const { t } = useLang();
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => i);

  return (
    <figure className="cd-grid" style={{ '--fcol': FLAGGED_COL } as CSSProperties}>
      <div className="cd-grid__dots" role="img" aria-label={t(copy.label)}>
        {cells.map((i) => {
          const row = Math.floor(i / SIZE);
          const col = i % SIZE;
          const style = { '--d': (row + col) * 38 } as CSSProperties;
          if (i === FLAGGED) {
            return (
              <a key={i} href="#receipt" className="cd-dot cd-dot--held" style={style} tabIndex={-1} aria-hidden="true" onClick={onOpen}>
                <span />
              </a>
            );
          }
          return (
            <span key={i} className="cd-dot" style={style}>
              <span />
            </span>
          );
        })}
      </div>
      <a href="#receipt" className="cd-callout" onClick={onOpen}>
        <span className="cd-callout__head">
          <span className="cd-callout__dot" aria-hidden="true" />
          {t(copy.held)}
        </span>
        <span className="cd-callout__what">{t(copy.edited)}</span>
        <span className="cd-callout__go">
          {t(copy.see)} <span className="cd-arrow" aria-hidden="true">↓</span>
        </span>
      </a>
      <figcaption className="cd-grid__legend">
        <span>
          <i className="cd-key" aria-hidden="true" /> <b>99</b> {t(copy.paid)}
        </span>
        <span>
          <i className="cd-key cd-key--held" aria-hidden="true" /> <b>1</b> {t(copy.review)}
        </span>
        <span className="cd-grid__caption">{t(copy.caption)}</span>
      </figcaption>
    </figure>
  );
}
