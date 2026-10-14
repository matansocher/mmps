import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SHOP_URL,
  ZIKA_SITE,
  asset,
  brand,
  careersUrl,
  catalog,
  categories,
  certifications,
  contacts,
  featuredProducts,
  formatIls,
  international,
  knowledge,
  migatronic,
  nav,
  quoteMailto,
  storesUrl,
  z11,
} from '../../content/index.ts';
import { CartProvider, useCart } from '../../lib/cart.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import './catalog.css';

type ProductSearchItem = {
  readonly label: string;
  readonly detail: string;
  readonly href: string;
  readonly internal?: boolean;
};

type ProductRow = {
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly aws?: string;
  readonly iso?: string;
  readonly href?: string;
  readonly datasheet?: string;
  readonly internal?: boolean;
};

export const productRows: readonly ProductRow[] = [
  {
    name: z11.model,
    category: 'אלקטרודות',
    description: z11.oneLiner,
    aws: z11.aws,
    iso: z11.iso,
    datasheet: z11.datasheetPdf,
    href: '/catalog/product/z-11',
    internal: true,
  },
  ...featuredProducts.map((product) => ({
    name: product.name,
    category: product.id === 'panor-w' ? 'בטיחות' : 'מכונות',
    description: product.kind,
    href: product.href,
  })),
  ...z11.family.map((product) => ({
    name: product.model,
    category: 'אלקטרודות',
    description: product.use,
    aws: product.aws,
    href: product.href,
  })),
];

const searchItems: readonly ProductSearchItem[] = [
  ...categories.map((category) => ({ label: category.name, detail: category.short, href: category.href })),
  ...featuredProducts.map((product) => ({ label: product.name, detail: product.kind, href: product.href })),
  { label: z11.model, detail: z11.name, href: '/catalog/product/z-11', internal: true },
];

export function CatalogPage({ children }: { readonly children: ReactNode }) {
  useFonts('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Noto+Sans+Hebrew:wght@400;500;600;700;800&display=swap');

  return (
    <CartProvider>
      <div className="c-catalog" dir="rtl">
        {/* THESIS: a mainstream technical catalog that makes Zika feel precise and easy to buy, refusing the gimmick concept page. OWN-WORLD: white cards, light blue-grey bands, navy table headers, steel-blue controls, Zika gold as calibrated brand signal. STORY: engineers find a product family, compare standards, open documents, then buy or request a quote. FIRST VIEWPORT: utility rail and catalog header over a split technical hero with product image, facts, and quick actions. FORM: brief-pinned Böhler/Kiswel catalog canon, staged as a compact homepage table plus dense PDP selector. */}
        <Header />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}

function Header() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const cart = useCart();
  const suggestions = useMemo(() => getSearchSuggestions(query), [query]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const best = suggestions[0];
    if (best?.internal) {
      navigate(best.href);
      setQuery('');
      return;
    }
    if (best) {
      window.location.href = best.href;
      return;
    }
    const term = query.trim();
    if (term) window.location.href = `${SHOP_URL}/?s=${encodeURIComponent(term)}`;
  };

  const chooseSuggestion = (item: ProductSearchItem) => {
    if (item.internal) navigate(item.href);
    else window.location.href = item.href;
    setQuery('');
  };

  const handleSearchKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setQuery('');
  };

  return (
    <header className="catalog-header">
      <div className="catalog-utility" aria-label="קישורים מהירים">
        <a href={brand.phoneHref}>{brand.phone}</a>
        <a href={storesUrl}>חנויות</a>
        <a href={certifications.certificatesUrl}>תעודות איכות</a>
        <a className="utility-shop" href={SHOP_URL}>חנות זיקה</a>
      </div>
      <div className="catalog-navwrap">
        <Link className="catalog-logo" to="/catalog" aria-label="דף הבית של זיקה">
          <span className="logo-mark"><img src={brand.logos.mark} alt="" width="40" height="34" /></span>
          <img src={brand.logos.wordmark} alt={brand.legalName} width="122" height="33" />
        </Link>
        <button className="menu-toggle" type="button" aria-expanded={isMenuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <span />
          <span />
          <span />
          תפריט
        </button>
        <nav className={isMenuOpen ? 'catalog-nav is-open' : 'catalog-nav'} aria-label="ניווט ראשי">
          <Link to="/catalog">בית</Link>
          {nav.map((item) => (
            <a href={item.href} key={item.label}>{item.label}</a>
          ))}
        </nav>
        <form className="catalog-search" onSubmit={submitSearch} role="search">
          <label className="sr-only" htmlFor="catalog-search-input">חיפוש מוצרים</label>
          <input
            id="catalog-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeys}
            placeholder="חיפוש מוצר, תקן או קטגוריה"
            autoComplete="off"
          />
          <button type="submit">חפש</button>
          {query.trim() && suggestions.length > 0 ? (
            <div className="search-suggestions" role="listbox">
              {suggestions.map((item) => (
                <button key={`${item.label}-${item.detail}`} type="button" onClick={() => chooseSuggestion(item)}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          ) : null}
        </form>
        <button className="cart-button" type="button" onClick={cart.open} aria-label={`סל קניות, ${cart.count} פריטים`}>
          <span>סל</span>
          <bdi>{cart.count}</bdi>
        </button>
      </div>
    </header>
  );
}

function getSearchSuggestions(query: string): readonly ProductSearchItem[] {
  const term = query.trim().toLocaleLowerCase('he-IL');
  if (!term) return [];
  return searchItems.filter((item) => `${item.label} ${item.detail}`.toLocaleLowerCase('he-IL').includes(term)).slice(0, 5);
}

function CartDrawer() {
  const cart = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!cart.isOpen) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>('button, a')?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [cart.isOpen]);

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cart.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart]);

  if (!cart.isOpen) return null;

  const quoteHref = quoteMailto(
    cart.lines.length
      ? cart.lines.map((line) => `${line.variant.sku} · ${line.variant.diameterMm} מ״מ · כמות ${line.qty}`)
      : ['אשמח לקבל הצעת מחיר למוצרי זיקה.'],
  );

  return (
    <div className="cart-layer" role="presentation">
      <button className="cart-scrim" type="button" aria-label="סגירת סל" onClick={cart.close} />
      <aside className="cart-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-head">
          <h2 id="cart-title">סל קניות</h2>
          <button type="button" onClick={cart.close}>סגור</button>
        </div>
        {cart.lines.length ? (
          <>
            <div className="cart-lines">
              {cart.lines.map((line) => (
                <article className="cart-line" key={line.sku}>
                  <div>
                    <strong>{z11.model} · <bdi>{line.variant.diameterMm}</bdi> מ״מ</strong>
                    <span><bdi>{line.variant.currentA}</bdi> אמפר · {line.variant.packKg} ק״ג</span>
                  </div>
                  <div className="qty-mini" aria-label={`כמות עבור ${line.sku}`}>
                    <button type="button" onClick={() => cart.setQty(line.sku, line.qty - 1)}>-</button>
                    <bdi>{line.qty}</bdi>
                    <button type="button" onClick={() => cart.setQty(line.sku, line.qty + 1)}>+</button>
                  </div>
                  <strong>{formatIls(line.lineTotal)}</strong>
                  <button className="remove-line" type="button" onClick={() => cart.remove(line.sku)}>הסר</button>
                </article>
              ))}
            </div>
            <div className="cart-total">
              <span>סכום ביניים</span>
              <strong>{formatIls(cart.subtotal)}</strong>
            </div>
            <p className="cart-note">{z11.shipping.label}: {formatIls(z11.shipping.priceIls)}. התשלום מתבצע בחנות זיקה.</p>
            <a className="btn primary" href={z11.shopUrl}>המשך לתשלום בחנות זיקה</a>
            <a className="btn secondary" href={quoteHref}>בקשת הצעת מחיר</a>
          </>
        ) : (
          <div className="cart-empty">
            <p>הסל ריק. התחילו עם האלקטרודה הפופולרית לריתוך מבנים.</p>
            <Link className="btn primary" to="/catalog/product/z-11" onClick={cart.close}>לעמוד Z-11</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function Footer() {
  return (
    <footer className="catalog-footer">
      <div className="footer-brand">
        <img src={brand.logos.stacked} alt={brand.legalName} width="72" height="98" />
        <p>{storyLine()}</p>
      </div>
      <nav aria-label="קישורי תחתית">
        <a href={ZIKA_SITE}>אתר זיקה</a>
        <a href={catalog.href}>{catalog.title}</a>
        <a href={storesUrl}>חנויות</a>
        <a href={careersUrl}>קריירה</a>
        <a href={brand.accessibilityStatement}>הצהרת נגישות</a>
      </nav>
      <address>
        <strong>{contacts[0].dept}</strong>
        <a href={brand.phoneHref}>{brand.phone}</a>
        <a href={`mailto:${brand.email}`}>{brand.email}</a>
      </address>
      <div className="social-links" aria-label="רשתות חברתיות">
        <a href={brand.social.facebook}>Facebook</a>
        <a href={brand.social.youtube}>YouTube</a>
        <a href={brand.social.linkedin}>LinkedIn</a>
      </div>
    </footer>
  );
}

function storyLine() {
  return `${brand.legalName} נוסדה בשנת ${brand.founded}, מייצרת בישראל ומייצאת ליותר מ-${international.countryCount} מדינות.`;
}

export function QuickRail() {
  return (
    <aside className="quick-rail" aria-label="גישה מהירה">
      <a href={catalog.href}>קטלוג PDF</a>
      <a href={z11.datasheetPdf}>דפי מידע</a>
      <a href={storesUrl}>חנויות</a>
      <a href={`mailto:${brand.email}`}>צור קשר</a>
    </aside>
  );
}

export function SmartLink({ row }: { readonly row: ProductRow }) {
  if (!row.href) return <span>—</span>;
  return row.internal ? <Link to={row.href}>פתח</Link> : <a href={row.href}>פתח</a>;
}

export function PdfIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path d="M6 2h8l4 4v16H6z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 2v5h5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 16h8M8 12h8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export { SHOP_URL, asset, brand, catalog, categories, certifications, contacts, featuredProducts, formatIls, international, knowledge, migatronic, quoteMailto, storesUrl, z11 };
