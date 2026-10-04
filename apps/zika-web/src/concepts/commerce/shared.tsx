import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SHOP_URL,
  brand,
  careersUrl,
  categories,
  certifications,
  contacts,
  featuredProducts,
  formatIls,
  nav,
  quoteMailto,
  shopPromises,
  storesUrl,
  z11,
} from '../../content/index.ts';
import { CartProvider, useCart, type CartLineView } from '../../lib/cart.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import './commerce.css';

type SearchItem = {
  readonly label: string;
  readonly meta: string;
  readonly href?: string;
  readonly to?: string;
};

const searchItems: readonly SearchItem[] = [
  { label: z11.model, meta: z11.name, to: '/commerce/product/z-11' },
  ...categories.map((category) => ({ label: category.name, meta: 'קטגוריה', href: category.href })),
  ...featuredProducts.map((product) => ({ label: product.name, meta: product.kind, href: product.href })),
];

function checkoutHref(lines: readonly CartLineView[]): string {
  if (!lines.length) return z11.shopUrl;
  const text = lines.map((line) => `${line.variant.sku} × ${line.qty}`).join('\n');
  return `${z11.shopUrl}?note=${encodeURIComponent(text)}`;
}

function quoteHref(lines: readonly CartLineView[]): string {
  const details = lines.length ? lines.map((line) => `${line.variant.sku} | ${line.variant.diameterMm} מ״מ | כמות ${line.qty} | ${formatIls(line.lineTotal)}`) : ['אשמח לקבל הצעת מחיר עבור Z-11'];
  return quoteMailto(details);
}

function QuantityButton({ label, onClick, disabled }: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return (
    <button className="c-commerce__qty-button" type="button" onClick={onClick} disabled={disabled} aria-label={label}>
      {label === 'הפחת' ? '−' : '+'}
    </button>
  );
}

export function SearchBox({ compact = false }: { readonly compact?: boolean }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return searchItems.slice(0, compact ? 4 : 6);
    return searchItems.filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(term)).slice(0, 6);
  }, [compact, query]);

  const goTo = (item: SearchItem) => {
    if (item.to) navigate(item.to);
    else if (item.href) window.location.href = item.href;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const first = matches[0];
    if (first) {
      goTo(first);
      return;
    }
    const term = query.trim();
    if (term) window.location.href = `${SHOP_URL}/?s=${encodeURIComponent(term)}`;
  };

  return (
    <form className="c-commerce__search" role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor={compact ? 'commerce-search-mobile' : 'commerce-search'}>
        חיפוש מוצר
      </label>
      <input id={compact ? 'commerce-search-mobile' : 'commerce-search'} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש מוצר או קטגוריה" autoComplete="off" />
      <button type="submit">חפש</button>
      {query.trim() && (
        <div className="c-commerce__suggestions" role="listbox" aria-label="הצעות חיפוש">
          {matches.map((item) => (
            <button key={`${item.label}-${item.meta}`} type="button" role="option" onClick={() => goTo(item)}>
              <span>{item.label}</span>
              <small>{item.meta}</small>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

function CartButton() {
  const cart = useCart();
  return (
    <button className="c-commerce__cart-trigger" type="button" onClick={cart.open} aria-haspopup="dialog">
      <span>עגלה</span>
      <strong>{cart.count}</strong>
    </button>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="c-commerce__header">
      <div className="c-commerce__utility">
        <a href={brand.phoneHref}>{brand.phone}</a>
        <a href={storesUrl}>חנויות</a>
        <a href={SHOP_URL}>חנות זיקה</a>
      </div>
      <div className="c-commerce__nav-shell">
        <Link className="c-commerce__brand" to="/commerce" aria-label="דף הבית של זיקה">
          <span className="c-commerce__logo-chip"><img src={brand.logos.mark} alt="" width="80" height="68" /></span>
          <img className="c-commerce__wordmark" src={brand.logos.wordmark} alt="זיקה" width="244" height="65" />
        </Link>
        <nav className="c-commerce__main-nav" aria-label="ניווט ראשי">
          {nav.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <SearchBox />
        <CartButton />
        <button className="c-commerce__menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="commerce-mobile-menu">
          תפריט
        </button>
      </div>
      <div id="commerce-mobile-menu" className="c-commerce__mobile-menu" hidden={!open}>
        <SearchBox compact />
        {nav.map((item) => (
          <a key={item.label} href={item.href}>{item.label}</a>
        ))}
      </div>
    </header>
  );
}

function CartDrawer() {
  const cart = useCart();
  const dialogRef = useRef<HTMLElement>(null);
  const lastActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!cart.isOpen) return;
    lastActive.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      lastActive.current?.focus();
    };
  }, [cart.isOpen]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') cart.close();
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="c-commerce__cart-layer" data-open={cart.isOpen || undefined} aria-hidden={!cart.isOpen}>
      <button className="c-commerce__cart-backdrop" type="button" onClick={cart.close} tabIndex={cart.isOpen ? 0 : -1} aria-label="סגירת עגלה" />
      <aside className="c-commerce__cart-drawer" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="commerce-cart-title" tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="c-commerce__cart-head">
          <h2 id="commerce-cart-title">עגלה</h2>
          <button type="button" onClick={cart.close}>סגור</button>
        </div>
        {cart.lines.length ? (
          <>
            <div className="c-commerce__cart-lines">
              {cart.lines.map((line) => (
                <article key={line.sku} className="c-commerce__cart-line">
                  <div>
                    <strong><bdi dir="ltr">{line.variant.sku}</bdi></strong>
                    <span>{line.variant.diameterMm} מ״מ · {line.variant.packKg} ק״ג · {line.variant.packaging}</span>
                    <button type="button" onClick={() => cart.remove(line.sku)}>הסר</button>
                  </div>
                  <div className="c-commerce__line-actions" aria-label={`כמות עבור ${line.sku}`}>
                    <QuantityButton label="הפחת" onClick={() => cart.setQty(line.sku, line.qty - 1)} />
                    <output>{line.qty}</output>
                    <QuantityButton label="הוסף" onClick={() => cart.setQty(line.sku, line.qty + 1)} />
                    <bdi dir="ltr">{formatIls(line.lineTotal)}</bdi>
                  </div>
                </article>
              ))}
            </div>
            <div className="c-commerce__cart-total">
              <span>סיכום ביניים</span>
              <strong><bdi dir="ltr">{formatIls(cart.subtotal)}</bdi></strong>
            </div>
            <p className="c-commerce__shipping-note">{z11.shipping.label}: <bdi dir="ltr">{formatIls(z11.shipping.priceIls)}</bdi></p>
            <a className="c-commerce__button c-commerce__button--primary" href={checkoutHref(cart.lines)}>המשך לתשלום בחנות זיקה</a>
            <a className="c-commerce__button c-commerce__button--ghost" href={quoteHref(cart.lines)}>בקשת הצעת מחיר</a>
          </>
        ) : (
          <div className="c-commerce__empty-cart">
            <p>העגלה ריקה. אפשר להתחיל עם Z-11.</p>
            <Link className="c-commerce__button c-commerce__button--primary" to="/commerce/product/z-11" onClick={cart.close}>למוצר Z-11</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function Footer() {
  return (
    <footer className="c-commerce__footer">
      <div>
        <img src={brand.logos.stacked} alt="זיקה WELD DONE" width="103" height="140" />
        <p>{brand.tagline}</p>
      </div>
      <nav aria-label="קישורי תחתית">
        {nav.slice(0, 5).map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        <a href={careersUrl}>קריירה בזיקה</a>
        <a href={brand.accessibilityStatement}>הצהרת נגישות</a>
      </nav>
      <address>
        <strong>{contacts[0].dept}</strong>
        <a href={`mailto:${contacts[0].email}`}>{contacts[0].email}</a>
        <a href={brand.phoneHref}>{brand.phone}</a>
        <span>פקס {brand.fax}</span>
      </address>
      <div className="c-commerce__social">
        <a href={brand.social.facebook}>Facebook</a>
        <a href={brand.social.youtube}>YouTube</a>
        <a href={brand.social.linkedin}>LinkedIn</a>
      </div>
    </footer>
  );
}

export function CommerceLayout({ children }: { readonly children: ReactNode }) {
  useFonts('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Heebo:wght@500;700;800;900&display=swap');
  return (
    <CartProvider>
      <div className="c-commerce" dir="rtl">
        <div className="c-commerce__contract" hidden>
          THESIS: ESAB-style brand commerce for Zika, refusing novelty themes. OWN-WORLD: gold header, black ink, grey technical tables, circular categories. STORY: choose, trust, quote, buy. FIRST VIEWPORT: brand bar, carousel, clear CTAs. FORM: polished mainstream ecommerce.
        </div>
        <Header />
        {children}
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}

export function PromiseStrip() {
  return (
    <div className="c-commerce__promise-strip" aria-label="יתרונות חנות זיקה">
      {shopPromises.map((promise) => (
        <div key={promise.label}>
          <img src={promise.icon} alt="" width="58" height="58" />
          <span>{promise.label}</span>
        </div>
      ))}
    </div>
  );
}

export function StandardsLine() {
  return (
    <div className="c-commerce__standards" aria-label="תקנים ואישורים">
      {[...certifications.process, ...certifications.thirdParty].slice(0, 8).map((item) => <bdi key={item} dir="ltr">{item}</bdi>)}
    </div>
  );
}
