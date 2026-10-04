import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { concepts, type ConceptSlug } from './concepts.ts';
import './concept-switcher.css';

export function ConceptSwitcher({ current }: { current: ConceptSlug }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onProduct = pathname.includes('/product/');
  const active = concepts.find((c) => c.slug === current)!;

  return (
    <nav className={`zk-switch${open ? ' is-open' : ''}`} aria-label="מעבר בין קונספטים" dir="rtl">
      {open && (
        <div className="zk-switch__panel" id="zk-switch-panel">
          <Link to="/" className="zk-switch__home">
            כל הקונספטים
          </Link>
          <ol className="zk-switch__list">
            {concepts.map((c) => (
              <li key={c.slug}>
                <Link to={onProduct ? `/${c.slug}/product/z-11` : `/${c.slug}`} aria-current={c.slug === current ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <span className="zk-switch__n">{c.index}</span>
                  <span>{c.hebrewName}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="zk-switch__pages">
            <Link to={`/${current}`} aria-current={!onProduct ? 'page' : undefined}>
              דף הבית
            </Link>
            <Link to={`/${current}/product/z-11`} aria-current={onProduct ? 'page' : undefined}>
              דף מוצר Z‑11
            </Link>
          </div>
        </div>
      )}
      <button type="button" className="zk-switch__toggle" aria-expanded={open} aria-controls="zk-switch-panel" onClick={() => setOpen((o) => !o)}>
        <span className="zk-switch__n">{active.index}</span>
        <span>{active.hebrewName}</span>
        <span aria-hidden="true" className="zk-switch__chev">
          {open ? '×' : '⇅'}
        </span>
      </button>
    </nav>
  );
}
