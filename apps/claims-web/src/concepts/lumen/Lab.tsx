import { useRef, useState, type PointerEvent } from 'react';
import { checks } from '../../content/index.ts';
import { useLang } from '../../lib/i18n.tsx';
import { lab } from './copy.ts';
import { Specimens } from './Specimens.tsx';

export function Lab() {
  const { t } = useLang();
  const tableRef = useRef<HTMLDivElement>(null);
  const [manual, setManual] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const place = (x: number, y: number) => {
    const el = tableRef.current;
    if (!el) return;
    el.style.setProperty('--lm-x', `${x}px`);
    el.style.setProperty('--lm-y', `${y}px`);
  };

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' && e.type === 'pointermove') return;
    const rect = e.currentTarget.getBoundingClientRect();
    place(e.clientX - rect.left, e.clientY - rect.top);
    setManual(true);
    setActive(null);
  };

  const aim = (key: string) => {
    const el = tableRef.current;
    const target = el?.querySelector<HTMLElement>(`.lm-layer--uv [data-mark='${key}']`)?.parentElement;
    if (!el || !target) return;
    const a = el.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    place(b.left - a.left + b.width / 2, b.top - a.top + b.height / 2);
    setManual(true);
    setActive(key);
  };

  return (
    <section className="lm-section lm-lab" id="checks" aria-labelledby="lm-checks-title">
      <div className="lm-wrap">
        <div className="lm-head">
          <h2 id="lm-checks-title">{t(lab.title)}</h2>
          <p className="lm-hint">
            <span className="lm-hint--hover">{t(lab.hintHover)}</span>
            <span className="lm-hint--touch">{t(lab.hintTouch)}</span>
            <span className="lm-hint--static">{t(lab.hintStatic)}</span>
          </p>
        </div>
        <div className="lm-lab__grid">
          <div
            ref={tableRef}
            className={`lm-table${manual ? ' is-manual' : ''}`}
            role="img"
            aria-label={t(lab.tableLabel)}
            onPointerMove={follow}
            onPointerDown={follow}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setManual(false)}
          >
            <div className="lm-layer lm-layer--base">
              <Specimens uv={false} />
            </div>
            <div className="lm-layer lm-layer--uv" aria-hidden="true">
              <Specimens uv />
            </div>
            <span className="lm-halo" aria-hidden="true" />
            <span className="lm-graticule" aria-hidden="true" />
          </div>
          <div className="lm-key">
            <h3 className="lm-key__title">{t(lab.keyLabel)}</h3>
            <ol className="lm-key__list">
              {checks.map((c, i) => (
                <li key={c.key}>
                  <button type="button" className="lm-key__item" aria-pressed={active === c.key} onClick={() => aim(c.key)} onMouseEnter={() => aim(c.key)} onFocus={() => aim(c.key)}>
                    <span className="lm-key__n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="lm-key__body">
                      <span className="lm-key__name">{t(c.title)}</span>
                      <span className="lm-key__text">{t(c.text)}</span>
                      <span className="lm-key__ex">
                        <span className="lm-key__exlabel">{t(lab.typical)}:</span> {t(c.example)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
