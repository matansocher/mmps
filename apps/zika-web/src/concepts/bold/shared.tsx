import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SHOP_URL,
  asset,
  brand,
  catalog,
  categories,
  contacts,
  featuredProducts,
  formatIls,
  nav,
  quoteMailto,
  storesUrl,
  z11,
} from '../../content/index.ts';
import { useCart, type CartLineView } from '../../lib/cart.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import './bold.css';

type SearchItem = {
  readonly label: string;
  readonly detail: string;
  readonly href: string;
  readonly internal?: boolean;
};

const searchItems: readonly SearchItem[] = [
  ...categories.map((category) => ({ label: category.name, detail: 'קטגוריה', href: category.href })),
  ...featuredProducts.map((product) => ({ label: product.name, detail: product.kind, href: product.href })),
  { label: z11.name, detail: `${z11.awsShort} · דף מוצר`, href: '/bold/product/z-11', internal: true },
  { label: catalog.title, detail: 'קטלוג להורדה', href: catalog.href },
  { label: 'חנויות זיקה', detail: 'איתור חנויות', href: storesUrl },
];

const quickLinks: readonly SearchItem[] = [
  { label: 'קטלוג מוצרים', detail: 'קישור מהיר', href: nav[0].href },
  { label: 'חנויות', detail: 'קישור מהיר', href: storesUrl },
  { label: 'מכונות Migatronic', detail: 'קישור מהיר', href: nav[2].href },
  { label: 'Z-11 אונליין', detail: 'קישור מהיר', href: '/bold/product/z-11', internal: true },
] as const;

export function DesignContract() {
  return (
    <div
      className="c-bold__contract"
      dangerouslySetInnerHTML={{
        __html:
          '<!-- THESIS: Zika becomes a full-scale industrial manufacturer site, refusing the small catalog-homepage feel. OWN-WORLD: white base, near-black architecture, Zika gold as the only command color, heavy Hebrew display type, hard-edged photographic cards. STORY: identify the welding need, trust the local manufacturer, move to catalog or Z-11 purchase. FIRST VIEWPORT: sticky corporate header, full-bleed welding hero cropped to arc/helmet, dark text field, single gold CTA, bottom quick links, search immediately below. FORM: brief-pinned Bold Industrial, staged from Lincoln hero/search plus Miller category shelf and PDP buy box. -->',
      }}
    />
  );
}

export function Layout({ children, page }: { readonly children: ReactNode; readonly page: 'home' | 'product' }) {
  useFonts('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap');
  const cart = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="c-bold">
      <DesignContract />
      <a className="c-bold__skip" href="#main">
        דילוג לתוכן
      </a>
      <Header cartCount={cart.count} onCartOpen={cart.open} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} />
      <main id="main" aria-hidden={cart.isOpen ? 'true' : undefined}>
        {children}
      </main>
      <Footer />
      <CartDrawer returnFocusSelector={page === 'product' ? '[data-bold-add-main]' : '[data-bold-cart]'} />
    </div>
  );
}

function Header({
  cartCount,
  onCartOpen,
  menuOpen,
  onMenuToggle,
}: {
  readonly cartCount: number;
  readonly onCartOpen: () => void;
  readonly menuOpen: boolean;
  readonly onMenuToggle: () => void;
}) {
  return (
    <>
      <div className="c-bold__topbar-wrap">
        <div className="c-bold__topbar">
          <div className="c-bold__topbar-contact">
            <a href={brand.phoneHref}>{brand.phone}</a>
            <a href={`mailto:${brand.email}`}>{brand.email}</a>
          </div>
          <div className="c-bold__topbar-links">
            <a href={storesUrl}>חנויות</a>
            <a href={brand.accessibilityStatement}>נגישות</a>
            <a className="c-bold__shop-link" href={SHOP_URL}>
              חנות זיקה
            </a>
          </div>
        </div>
      </div>
      <header className="c-bold__header">
        <div className="c-bold__nav">
          <Link className="c-bold__logo" to="/bold" aria-label="זיקה – עמוד הבית">
            <img src={brand.logos.wordmark} alt="זיקה" width="150" height="40" />
          </Link>
          <button className="c-bold__mobile-toggle" type="button" aria-expanded={menuOpen} aria-controls="bold-menu" onClick={onMenuToggle}>
            ☰
          </button>
          <nav className="c-bold__menu" id="bold-menu" data-open={menuOpen} aria-label="ניווט ראשי">
            {nav.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="c-bold__actions">
            <SearchBox compact />
            <button className="c-bold__cart" data-bold-cart type="button" onClick={onCartOpen} aria-label={`פתיחת סל קניות, ${cartCount} פריטים`}>
              סל <span className="c-bold__cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export function SearchBox({ compact = false }: { readonly compact?: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('he-IL');
    if (!q) return searchItems.slice(0, compact ? 3 : 5);
    return searchItems.filter((item) => `${item.label} ${item.detail}`.toLocaleLowerCase('he-IL').includes(q)).slice(0, compact ? 4 : 6);
  }, [compact, query]);

  const go = (item: SearchItem) => {
    if (item.internal) navigate(item.href);
    else window.location.href = item.href;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const first = matches[0] ?? searchItems[0];
    go(first);
  };

  return (
    <form className={compact ? 'c-bold__mini-search' : 'c-bold__search-box'} role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor={compact ? 'bold-mini-search' : 'bold-main-search'}>
        חיפוש מוצר
      </label>
      <input
        id={compact ? 'bold-mini-search' : 'bold-main-search'}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="חיפוש מוצר או קטגוריה"
        autoComplete="off"
      />
      {query.trim() && (
        <div className="c-bold__suggestions">
          {matches.map((item) =>
            item.internal ? (
              <Link key={item.label} to={item.href}>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </Link>
            ) : (
              <a key={item.label} href={item.href}>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </a>
            ),
          )}
        </div>
      )}
    </form>
  );
}

export function QuickStrip() {
  return (
    <div className="c-bold__quick-strip">
      <div className="c-bold__quick-inner">
        {quickLinks.map((item) =>
          item.internal ? (
            <Link key={item.label} to={item.href}>
              {item.label}
              <span>←</span>
            </Link>
          ) : (
            <a key={item.label} href={item.href}>
              {item.label}
              <span>←</span>
            </a>
          ),
        )}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="c-bold__footer">
      <div className="c-bold__footer-inner">
        <div>
          <img src={brand.logos.stacked} alt="זיקה Weld Done" width="90" height="122" loading="lazy" />
          <p>{brand.tagline}</p>
        </div>
        <div>
          <h3>ניווט</h3>
          <ul>
            {nav.slice(0, 5).map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>יצירת קשר</h3>
          <ul>
            {contacts.map((contact) => (
              <li key={contact.dept}>
                <a href={`mailto:${contact.email}`}>
                  {contact.dept}: {contact.phone}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>זיקה ברשת</h3>
          <ul>
            <li>
              <a href={brand.social.facebook}>Facebook</a>
            </li>
            <li>
              <a href={brand.social.youtube}>YouTube</a>
            </li>
            <li>
              <a href={brand.social.linkedin}>LinkedIn</a>
            </li>
            <li>
              <a href={brand.accessibilityStatement}>הצהרת נגישות</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function lineToQuote(line: CartLineView): string {
  return `${line.variant.sku} · ${line.variant.diameterMm} מ״מ · כמות ${line.qty} · ${formatIls(line.lineTotal)}`;
}

function CartDrawer({ returnFocusSelector }: { readonly returnFocusSelector: string }) {
  const cart = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!cart.isOpen) return undefined;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => drawerRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cart.close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      const target = previousFocus.current ?? document.querySelector<HTMLElement>(returnFocusSelector);
      target?.focus();
    };
  }, [cart, returnFocusSelector]);

  if (!cart.isOpen) return null;

  const quoteHref = quoteMailto(cart.lines.length ? cart.lines.map(lineToQuote) : ['אשמח לקבל הצעת מחיר עבור Z-11']);

  return (
    <>
      <button className="c-bold__drawer-overlay" type="button" aria-label="סגירת סל" onClick={cart.close} />
      <aside className="c-bold__drawer" role="dialog" aria-modal="true" aria-labelledby="bold-cart-title" tabIndex={-1} ref={drawerRef}>
        <div className="c-bold__drawer-head">
          <h2 id="bold-cart-title">סל קניות</h2>
          <button className="c-bold__drawer-close" type="button" onClick={cart.close} aria-label="סגירת סל">
            ×
          </button>
        </div>
        <div className="c-bold__drawer-lines">
          {cart.lines.length ? (
            cart.lines.map((line) => (
              <div className="c-bold__line" key={line.sku}>
                <div className="c-bold__line-top">
                  <div>
                    <strong>{line.variant.sku}</strong>
                    <p>
                      קוטר <bdi>{line.variant.diameterMm}</bdi> מ״מ · {line.variant.packKg} ק״ג
                    </p>
                  </div>
                  <strong>{formatIls(line.lineTotal)}</strong>
                </div>
                <div className="c-bold__order-row">
                  <Qty value={line.qty} onChange={(qty) => cart.setQty(line.sku, qty)} />
                  <button className="c-bold__remove" type="button" onClick={() => cart.remove(line.sku)}>
                    הסרה
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="c-bold__empty">
              <div>
                <p>הסל עדיין ריק.</p>
                <Link className="c-bold__primary" to="/bold/product/z-11" onClick={cart.close}>
                  מעבר ל-Z-11
                </Link>
              </div>
            </div>
          )}
        </div>
        <div className="c-bold__drawer-foot">
          <div className="c-bold__subtotal">
            <span>סיכום ביניים</span>
            <span>{formatIls(cart.subtotal)}</span>
          </div>
          <p>
            משלוח: {z11.shipping.label} · {formatIls(z11.shipping.priceIls)}
          </p>
          <a className="c-bold__primary" href={z11.shopUrl}>
            המשך לתשלום בחנות זיקה
          </a>
          <a className="c-bold__ghost" href={quoteHref}>
            בקשת הצעת מחיר
          </a>
        </div>
      </aside>
    </>
  );
}

export function Qty({ value, onChange }: { readonly value: number; readonly onChange: (value: number) => void }) {
  return (
    <div className="c-bold__qty" aria-label="בחירת כמות">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="הפחתת כמות">
        −
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(99, value + 1))} aria-label="הגדלת כמות">
        +
      </button>
    </div>
  );
}

export function ContactBlock() {
  const [sent, setSent] = useState(false);
  return (
    <section className="c-bold__contact-wrap">
      <div className="c-bold__section c-bold__contact">
        <div>
          <h2>צריכים התאמה טכנית?</h2>
          <p>צוות המכירות והייעוץ הטכני של זיקה זמין להתאמת אלקטרודות, מכונות וציוד משלים לפי העבודה בפועל.</p>
        </div>
        <form
          className="c-bold__form"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          <label className="c-bold__field">
            שם
            <input name="name" autoComplete="name" required />
          </label>
          <label className="c-bold__field">
            טלפון
            <input name="phone" autoComplete="tel" required />
          </label>
          <label className="c-bold__field">
            הודעה
            <textarea name="message" required />
          </label>
          <button className="c-bold__primary" type="submit">
            שליחת פנייה
          </button>
          <span className="c-bold__form-note" role="status">
            {sent ? 'תודה, בטיוטה זו הפנייה מוצגת כהדגמה.' : ''}
          </span>
        </form>
      </div>
    </section>
  );
}

export { asset };
