import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  SHOP_URL,
  ZIKA_SITE,
  asset,
  brand,
  careersUrl,
  catalog,
  categories,
  college,
  contacts,
  featuredProducts,
  formatIls,
  greenSeries,
  industries,
  international,
  knowledge,
  migatronic,
  nav,
  photos,
  quoteMailto,
  shopPromises,
  storesUrl,
  story,
  z11,
  type Z11Variant,
} from '../../content/index.ts';
import { useCart } from '../../lib/cart.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import './friendly.css';

type SearchItem = {
  readonly label: string;
  readonly meta: string;
  readonly href: string;
  readonly standards: readonly string[];
  readonly internal?: boolean;
};

type IconName = 'catalog' | 'videos' | 'stores' | 'college' | 'contact' | 'faq' | 'cart' | 'search' | 'menu' | 'close' | 'check' | 'download' | 'spark' | 'pin';

const contract = `<!--
THESIS: Modern Friendly makes Zika feel like the polished, easy-to-buy welding partner, refusing niche themed gimmicks and bloated catalog pages.
OWN-WORLD: warm #f7f6f2 ground, white rounded stages, ink text, Zika gold pills, Rubik everywhere, soft 16-24px radii and simple line SVG icons.
STORY: visitors find products fast, see Israeli manufacturing trust, open resources, and buy or request a quote without friction.
FIRST VIEWPORT: slim utility/header over a rounded photo hero, overlapping two-tab product search card, then a quick-link icon strip near the fold.
FORM: brief-pinned Modern Friendly; Hobart search-over-hero/catalog/photo-card patterns fused with Migatronic soft rounded UI.
-->`;

const searchItems: readonly SearchItem[] = [
  ...categories.map((category) => ({ label: category.name, meta: 'קטגוריה', href: category.href, standards: [category.short, category.id] })),
  ...featuredProducts.map((product) => ({ label: product.name, meta: product.kind, href: product.href, standards: product.facts })),
  { label: z11.name, meta: `${z11.awsShort} · ${z11.type}`, href: '/friendly/product/z-11', standards: [z11.aws, z11.iso, z11.awsShort], internal: true },
];

const quickLinks: readonly { readonly label: string; readonly href: string; readonly icon: IconName }[] = [
  { label: 'קטלוג', href: catalog.href, icon: 'catalog' },
  { label: 'סרטונים', href: knowledge[1].href, icon: 'videos' },
  { label: 'חנויות', href: storesUrl, icon: 'stores' },
  { label: 'מכללה', href: college.href, icon: 'college' },
  { label: 'צור קשר', href: '#contact', icon: 'contact' },
  { label: 'שאלות', href: knowledge[6].href, icon: 'faq' },
];

const heroResources = [
  { title: 'סרטוני הדרכה', text: 'ספר הדרכה טכני לצפייה מהירה', image: asset('banner-videos.png'), href: knowledge[1].href },
  { title: featuredProducts[0].name, text: featuredProducts[0].kind, image: asset('banner-panoramic.png'), href: featuredProducts[0].href },
  { title: migatronic.name, text: migatronic.line, image: migatronic.catalogImage, href: migatronic.href },
] as const;

export function Layout({ children }: { readonly children: ReactNode }) {
  useFonts('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap&subset=hebrew');
  return (
    <div className="c-friendly" dir="rtl">
      <div dangerouslySetInnerHTML={{ __html: contract }} />
      <Header />
      {children}
      <Footer />
      <CartDrawer />
    </div>
  );
}

function Header() {
  const cart = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="c-friendly__site-head c-friendly__inertable">
      <div className="c-friendly__utility">
        <a href={brand.phoneHref}>{brand.phone}</a>
        <span>ייצור כחול-לבן משנת {brand.founded}</span>
        <a href={storesUrl}>חנויות</a>
        <a href={SHOP_URL}>חנות זיקה</a>
      </div>
      <div className="c-friendly__nav-shell">
        <Link className="c-friendly__logo" to="/friendly" aria-label="זיקה - דף הבית">
          <img src={brand.logos.wordmark} alt="זיקה" width="244" height="65" />
        </Link>
        <nav className="c-friendly__main-nav" aria-label="ניווט ראשי">
          {nav.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="c-friendly__head-actions">
          <ProductSearch compact />
          <button className="c-friendly__cart-pill" type="button" onClick={cart.open} aria-label={`פתח סל, ${cart.count} פריטים`}>
            <Icon name="cart" />
            <span>{cart.count}</span>
          </button>
          <button className="c-friendly__menu" type="button" onClick={() => setOpen(true)} aria-label="פתח תפריט">
            <Icon name="menu" />
          </button>
        </div>
      </div>
      <div className={`c-friendly__mobile-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <button type="button" onClick={() => setOpen(false)} aria-label="סגור תפריט">
          <Icon name="close" />
        </button>
        {nav.map((item) => (
          <a key={item.label} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}

export function ProductSearch({ compact = false }: { readonly compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'name' | 'standard'>('name');
  const matches = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return searchItems.slice(0, compact ? 3 : 5);
    return searchItems.filter((item) => {
      const haystack = mode === 'name' ? `${item.label} ${item.meta}` : item.standards.join(' ');
      return haystack.toLowerCase().includes(clean);
    });
  }, [compact, mode, query]);

  const go = (item: SearchItem) => {
    if (item.internal) window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${item.href}`;
    else window.location.href = item.href;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const first = matches[0];
    if (first) go(first);
    else window.location.href = `${SHOP_URL}/?s=${encodeURIComponent(query)}`;
  };

  return (
    <form className={`c-friendly__search ${compact ? 'c-friendly__search--compact' : ''}`} onSubmit={submit} role="search">
      {!compact && (
        <div className="c-friendly__search-tabs" role="tablist" aria-label="סוג חיפוש">
          <button type="button" className={mode === 'name' ? 'is-active' : ''} onClick={() => setMode('name')} role="tab" aria-selected={mode === 'name'}>
            לפי שם מוצר
          </button>
          <button type="button" className={mode === 'standard' ? 'is-active' : ''} onClick={() => setMode('standard')} role="tab" aria-selected={mode === 'standard'}>
            לפי תקן
          </button>
        </div>
      )}
      <label className="sr-only" htmlFor={compact ? 'friendly-search-small' : 'friendly-search'}>
        חיפוש מוצר
      </label>
      <div className="c-friendly__search-row">
        <Icon name="search" />
        <input id={compact ? 'friendly-search-small' : 'friendly-search'} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={compact ? 'חיפוש מוצר' : 'לדוגמה: Z-11 או E 6013'} />
        <button type="submit">חפש</button>
      </div>
      {!compact && (
        <div className="c-friendly__suggestions" aria-label="הצעות חיפוש">
          {matches.slice(0, 4).map((item) =>
            item.internal ? (
              <Link key={item.label} to={item.href}>
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </Link>
            ) : (
              <a key={item.label} href={item.href}>
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </a>
            ),
          )}
        </div>
      )}
    </form>
  );
}

export function HomePage() {
  return (
    <Layout>
      <main className="c-friendly__page c-friendly__inertable">
        <section className="c-friendly__hero">
          <div className="c-friendly__hero-photo">
            <img src={photos.hero.src} alt="מוצרי זיקה וריתוך מקצועי" width="2000" height="754" />
            <div className="c-friendly__hero-copy">
              <h1>לעולם ריתוך בריא ומקצועי יותר</h1>
              <p>זיקה תעשיות מייצרת בישראל אלקטרודות וחוטי ריתוך מאז {brand.founded}, ומשלבת קטלוג מקצועי, חנות אונליין ותמיכה טכנית במקום אחד.</p>
              <div className="c-friendly__hero-actions">
                <a className="c-friendly__btn c-friendly__btn--gold" href={catalog.href}>קטלוג 2026–27</a>
                <Link className="c-friendly__btn c-friendly__btn--light" to="/friendly/product/z-11">ל-Z‑11</Link>
              </div>
            </div>
          </div>
          <div className="c-friendly__hero-search">
            <ProductSearch />
          </div>
          <nav className="c-friendly__quick-strip" aria-label="קישורים מהירים">
            {quickLinks.map((link) => (
              <a key={link.label} href={link.href}>
                <Icon name={link.icon} />
                <span>{link.label}</span>
              </a>
            ))}
          </nav>
        </section>

        <Section title="קטגוריות מוצרים" intro="כניסה מהירה למשפחות המרכזיות של קטלוג זיקה.">
          <div className="c-friendly__category-grid">
            {categories.slice(0, 8).map((category) => (
              <a className="c-friendly__category" key={category.id} href={category.href}>
                <img src={category.image} alt="" width="195" height="134" loading="lazy" />
                <strong>{category.short}</strong>
                <span>{category.name}</span>
              </a>
            ))}
          </div>
        </Section>

        <Section title="מוצרים נבחרים" intro="ארבע נקודות כניסה ברורות למוצרים שהלקוחות מחפשים הרבה באתר הנוכחי.">
          <div className="c-friendly__featured">
            <article className="c-friendly__product-card">
              <div className="c-friendly__product-stage"><img src={z11.image} alt="אריזת אלקטרודות Z-11" loading="lazy" /></div>
              <h3>{z11.name}</h3>
              <p>{z11.oneLiner} מחיר החל מ-{formatIls(Math.min(...z11.variants.map((variant) => variant.priceIls)))}.</p>
              <Link className="c-friendly__text-link" to="/friendly/product/z-11">למידע נוסף ←</Link>
            </article>
            {featuredProducts.map((product) => (
              <article className="c-friendly__product-card" key={product.id}>
                <div className="c-friendly__product-stage"><img src={product.image} alt={product.name} loading="lazy" /></div>
                <h3>{product.name}</h3>
                <p>{product.pitch}</p>
                <a className="c-friendly__text-link" href={product.href}>למידע נוסף ←</a>
              </article>
            ))}
          </div>
        </Section>

        <section className="c-friendly__about">
          <div>
            <h2>ייצור ישראלי, תקינה בינלאומית, ליווי מקצועי</h2>
            <p>{story.profile}</p>
            <p>{story.sales}</p>
            <div className="c-friendly__badges">
              {[...certificationBadges(), ...industries.slice(0, 4)].map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div className="c-friendly__about-photos">
            <img src={photos.factoryRods.src} alt="קו ייצור אלקטרודות במפעל זיקה" width="689" height="212" loading="lazy" />
            <img src={photos.factoryLab.src} alt="מעבדת זיקה" width="689" height="212" loading="lazy" />
          </div>
        </section>

        <section className="c-friendly__catalog-card">
          <div className="c-friendly__catalog-copy">
            <h2>{catalog.title}</h2>
            <ul>
              <li><Icon name="check" /> משפחות מוצרים, תקנים ושימושים במקום אחד</li>
              <li><Icon name="download" /> הורדה מהירה של קטלוג זיקה העדכני</li>
              <li><Icon name="spark" /> מתאים לרכש, מסגריות וייעוץ טכני</li>
            </ul>
            <a className="c-friendly__btn c-friendly__btn--gold" href={catalog.href}>פתיחת הקטלוג</a>
          </div>
          <img src={catalog.image} alt="קטלוג מוצרי זיקה 2026–2027" width="574" height="396" loading="lazy" />
        </section>

        <Section title="מוצרים נבחרים ומשאבי ידע" intro="אותו תוכן מוכר מהאתר הקיים, במבנה קצר וברור יותר.">
          <div className="c-friendly__photo-cards">
            {heroResources.map((resource) => (
              <article key={resource.title}>
                <img src={resource.image} alt="" loading="lazy" />
                <div>
                  <h3>{resource.title}</h3>
                  <p>{resource.text}</p>
                  <a className="c-friendly__text-link" href={resource.href}>למידע נוסף ←</a>
                </div>
              </article>
            ))}
          </div>
        </Section>

        <section className="c-friendly__compact-row">
          <InfoTile title={greenSeries.name} text={`${greenSeries.claim}. ${greenSeries.products.join(' · ')}`} href={greenSeries.url} />
          <InfoTile title={college.name} text={college.tracksLine} href={college.href} image={college.image} />
          <InfoTile title={international.headline} text="רשת פעילות בינלאומית לצד ייצור מקומי ותמיכה בישראל." href={international.url} image={international.map} />
        </section>

        <ContactBlock />
      </main>
    </Layout>
  );
}

function Section({ title, intro, children }: { readonly title: string; readonly intro: string; readonly children: ReactNode }) {
  return (
    <section className="c-friendly__section">
      <div className="c-friendly__section-head">
        <h2>{title}</h2>
        <p>{intro}</p>
      </div>
      {children}
    </section>
  );
}

function InfoTile({ title, text, href, image }: { readonly title: string; readonly text: string; readonly href: string; readonly image?: string }) {
  return (
    <article>
      {image && <img src={image} alt="" loading="lazy" />}
      <h3>{title}</h3>
      <p>{text}</p>
      <a className="c-friendly__text-link" href={href}>למידע נוסף ←</a>
    </article>
  );
}

function ContactBlock() {
  const [sent, setSent] = useState(false);
  return (
    <section className="c-friendly__contact" id="contact">
      <div>
        <h2>צריכים התאמה או הצעת מחיר?</h2>
        <p>השאירו פרטים ונכין פנייה מסודרת למחלקת המכירות של זיקה.</p>
        <div className="c-friendly__contact-list">
          {contacts.map((contact) => (
            <a key={contact.dept} href={`mailto:${contact.email}`}>{contact.dept} · {contact.phone}</a>
          ))}
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setSent(true); window.location.href = quoteMailto(['שלום, אשמח לקבל מידע נוסף.', 'שם:', 'טלפון:', 'הודעה:']); }}>
        <label>שם מלא<input required name="name" /></label>
        <label>טלפון<input required name="phone" inputMode="tel" /></label>
        <label>הודעה<textarea name="message" rows={4} /></label>
        <button className="c-friendly__btn c-friendly__btn--gold" type="submit">שליחת פנייה</button>
        {sent && <p role="status">נפתחה הודעת מייל לדוגמה. במוצר חי הטופס יחובר למערכת האתר.</p>}
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer className="c-friendly__footer c-friendly__inertable">
      <div>
        <img src={brand.logos.stacked} alt="זיקה" width="103" height="140" />
        <p>{brand.legalName} · {brand.tagline}</p>
      </div>
      <nav aria-label="קישורי תחתית">
        {nav.slice(0, 5).map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        <a href={careersUrl}>קריירה בזיקה</a>
        <a href={brand.accessibilityStatement}>הצהרת נגישות</a>
      </nav>
      <address>
        <a href={brand.phoneHref}>{brand.phone}</a>
        <a href={`mailto:${brand.email}`}>{brand.email}</a>
        <a href={brand.social.facebook}>Facebook</a>
        <a href={brand.social.youtube}>YouTube</a>
        <a href={brand.social.linkedin}>LinkedIn</a>
      </address>
    </footer>
  );
}

function CartDrawer() {
  const cart = useCart();
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const inertables = Array.from(document.querySelectorAll<HTMLElement>('.c-friendly__inertable'));
    if (cart.isOpen) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.style.overflow = 'hidden';
      inertables.forEach((element) => {
        element.setAttribute('aria-hidden', 'true');
        (element as HTMLElement & { inert?: boolean }).inert = true;
      });
      setTimeout(() => panelRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = '';
      inertables.forEach((element) => {
        element.removeAttribute('aria-hidden');
        (element as HTMLElement & { inert?: boolean }).inert = false;
      });
      triggerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
      inertables.forEach((element) => {
        element.removeAttribute('aria-hidden');
        (element as HTMLElement & { inert?: boolean }).inert = false;
      });
    };
  }, [cart.isOpen]);

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cart.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart]);

  const quoteLines = cart.lines.length ? cart.lines.map((line) => `${line.variant.sku} · ${line.qty} יח׳ · ${formatIls(line.lineTotal)}`) : ['שלום, אשמח לקבל הצעת מחיר עבור Z-11.'];

  return (
    <div className={`c-friendly__drawer ${cart.isOpen ? 'is-open' : ''}`} aria-hidden={!cart.isOpen}>
      <button className="c-friendly__drawer-backdrop" type="button" onClick={cart.close} aria-label="סגור סל" />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="friendly-cart-title" tabIndex={-1}>
        <div className="c-friendly__drawer-head">
          <h2 id="friendly-cart-title">סל הזמנה</h2>
          <button type="button" onClick={cart.close} aria-label="סגור סל"><Icon name="close" /></button>
        </div>
        {cart.lines.length ? (
          <>
            <div className="c-friendly__cart-lines">
              {cart.lines.map((line) => <CartLine key={line.sku} line={line} />)}
            </div>
            <div className="c-friendly__subtotal"><span>סיכום ביניים</span><strong>{formatIls(cart.subtotal)}</strong></div>
            <p className="c-friendly__ship-note">{z11.shipping.label}: {formatIls(z11.shipping.priceIls)}.</p>
            <a className="c-friendly__btn c-friendly__btn--gold" href={z11.shopUrl}>המשך לתשלום בחנות זיקה</a>
            <a className="c-friendly__btn c-friendly__btn--light" href={quoteMailto(quoteLines)}>בקשת הצעת מחיר</a>
          </>
        ) : (
          <div className="c-friendly__empty-cart">
            <p>הסל ריק כרגע.</p>
            <Link className="c-friendly__btn c-friendly__btn--gold" to="/friendly/product/z-11" onClick={cart.close}>ל-Z‑11</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

type CartLineProps = {
  readonly line: {
    readonly sku: string;
    readonly qty: number;
    readonly variant: Z11Variant;
    readonly lineTotal: number;
  };
};

function CartLine({ line }: CartLineProps) {
  const cart = useCart();
  return (
    <article className="c-friendly__cart-line">
      <img src={z11.image} alt="" width="572" height="466" />
      <div>
        <strong>{line.variant.sku}</strong>
        <span><bdi>{line.variant.diameterMm}</bdi> מ״מ · {line.variant.packKg} ק״ג</span>
        <div className="c-friendly__qty">
          <button type="button" onClick={() => cart.setQty(line.sku, line.qty - 1)} aria-label="הפחת כמות">−</button>
          <output>{line.qty}</output>
          <button type="button" onClick={() => cart.setQty(line.sku, line.qty + 1)} aria-label="הוסף כמות">+</button>
        </div>
      </div>
      <div>
        <strong>{formatIls(line.lineTotal)}</strong>
        <button type="button" onClick={() => cart.remove(line.sku)}>הסרה</button>
      </div>
    </article>
  );
}

export function ProductPage() {
  const cart = useCart();
  const [selectedSku, setSelectedSku] = useState(z11.variants[2].sku);
  const [qty, setQty] = useState(1);
  const selected = z11.variants.find((variant) => variant.sku === selectedSku) ?? z11.variants[0];

  return (
    <Layout>
      <main className="c-friendly__page c-friendly__product c-friendly__inertable">
        <nav className="c-friendly__breadcrumbs" aria-label="פירורי לחם">
          <Link to="/friendly">בית</Link><span>›</span><a href={ZIKA_SITE}>קטלוג</a><span>›</span><a href={categories[0].href}>אלקטרודות</a><span>›</span><bdi>{z11.model}</bdi>
        </nav>
        <section className="c-friendly__pdp-hero" id="overview">
          <div className="c-friendly__gallery">
            <div className="c-friendly__gallery-stage">
              <img src={z11.image} alt="אריזת אלקטרודות Z-11" width="572" height="466" />
            </div>
            <div className="c-friendly__thumbs" aria-label="תמונות מוצר">
              <button type="button"><img src={z11.image} alt="אריזת Z-11" /></button>
              <button type="button"><img src={photos.electrodeLmn.src} alt="אלקטרודה מסדרת LMn" /></button>
              <button type="button"><img src={asset('positions.jpg')} alt="מצבי ריתוך" /></button>
            </div>
          </div>
          <BuyCard selected={selected} selectedSku={selectedSku} setSelectedSku={setSelectedSku} qty={qty} setQty={setQty} onAdd={() => cart.add(selected.sku, qty)} />
        </section>

        <nav className="c-friendly__sticky-tabs" aria-label="ניווט בעמוד מוצר">
          <a href="#overview">סקירה</a>
          <a href="#benefits">יתרונות</a>
          <a href="#specs">מפרט טכני</a>
          <a href="#order">הזמנה</a>
          <a href="#docs">מסמכים</a>
        </nav>

        <section className="c-friendly__spec-layout" id="benefits">
          <article>
            <h2>{z11.name}</h2>
            <p>{z11.oneLiner}</p>
            <ul>{z11.description.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <h2>יישומים</h2>
            <div className="c-friendly__chips">{z11.applications.map((item) => <span key={item}>{item}</span>)}</div>
          </article>
          <article>
            <h2>אח מסדרת LMn</h2>
            <p>{z11.lowMnSibling.line}</p>
            <a className="c-friendly__text-link" href={z11.lowMnSibling.href}>למידע נוסף ←</a>
          </article>
        </section>

        <section className="c-friendly__technical" id="specs">
          <h2>מפרט טכני</h2>
          <div className="c-friendly__spec-cards">
            <SpecCard label="סיווג AWS" value={z11.aws} />
            <SpecCard label="סיווג ISO" value={z11.iso} />
            <SpecCard label="ציפוי" value={z11.coating} />
            <SpecCard label="זרם" value={z11.current} />
            <SpecCard label="מצבים" value={z11.positions} />
            <SpecCard label="ייבוש מוקדם" value={z11.preDrying} />
          </div>
          <div className="c-friendly__tables">
            <DataTable title="הרכב כימי" headers={['יסוד', 'שם', '%']} rows={z11.chemistry.map((row) => [row.el, row.name, row.pct])} />
            <DataTable title="תכונות מכניות" headers={['בדיקה', 'ערך', 'יחידה']} rows={z11.mechanical.map((row) => [row.label, row.value, row.unit])} />
          </div>
          <DiameterTable />
        </section>

        <section className="c-friendly__order-band" id="order">
          <div>
            <h2>הזמנה ואריזה</h2>
            <p>{z11.packagingNote}</p>
            <p>{z11.shipping.label}: {formatIls(z11.shipping.priceIls)}.</p>
          </div>
          <button className="c-friendly__btn c-friendly__btn--gold" type="button" onClick={() => cart.add(selected.sku, qty)}>הוספה לסל</button>
        </section>

        <section className="c-friendly__docs" id="docs">
          <h2>מסמכים ומוצרים קרובים</h2>
          <div className="c-friendly__doc-actions">
            <a className="c-friendly__btn c-friendly__btn--light" href={z11.datasheetPdf}>דף נתונים Z‑11</a>
            <a className="c-friendly__btn c-friendly__btn--light" href={z11.lowMnPdf}>דף נתונים LMn</a>
          </div>
          <div className="c-friendly__family">
            {z11.family.map((item) => (
              <a key={item.model} href={item.href}>
                {item.image ? <img src={item.image} alt={item.model} loading="lazy" /> : <span className="c-friendly__family-placeholder">{item.model}</span>}
                <strong>{item.model}</strong>
                <span>{item.aws} · {item.use}</span>
                {item.price && <em>{item.price}</em>}
              </a>
            ))}
          </div>
        </section>

        <div className="c-friendly__mobile-buy">
          <a className="c-friendly__btn c-friendly__btn--light" href={quoteMailto([`${z11.model} · ${selected.sku}`])}>הצעת מחיר</a>
          <button className="c-friendly__btn c-friendly__btn--gold" type="button" onClick={() => cart.add(selected.sku, qty)}>הוספה לסל</button>
        </div>
      </main>
    </Layout>
  );
}

function BuyCard({ selected, selectedSku, setSelectedSku, qty, setQty, onAdd }: { readonly selected: Z11Variant; readonly selectedSku: string; readonly setSelectedSku: (sku: string) => void; readonly qty: number; readonly setQty: (qty: number) => void; readonly onAdd: () => void }) {
  return (
    <aside className="c-friendly__buy-card">
      <div>
        <span>{z11.category}</span>
        <h1><bdi>{z11.model}</bdi> לריתוך מבנים</h1>
        <p>{z11.aws} · {z11.iso}</p>
      </div>
      <fieldset>
        <legend>בחירת קוטר</legend>
        <div className="c-friendly__diameters" role="radiogroup">
          {z11.variants.map((variant) => (
            <label key={variant.sku} className={variant.sku === selectedSku ? 'is-selected' : ''}>
              <input type="radio" name="diameter" value={variant.sku} checked={variant.sku === selectedSku} onChange={() => setSelectedSku(variant.sku)} />
              <span><bdi>{variant.diameterMm}</bdi> מ״מ</span>
              <small><bdi>{variant.diameterIn}</bdi> · {formatIls(variant.priceIls)}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="c-friendly__selection">
        <span>אריזה: {selected.packKg} ק״ג · {selected.packaging}</span>
        <strong>{formatIls(selected.priceIls)}</strong>
      </div>
      <div className="c-friendly__buy-actions">
        <div className="c-friendly__qty">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <output>{qty}</output>
          <button type="button" onClick={() => setQty(Math.min(99, qty + 1))}>+</button>
        </div>
        <button className="c-friendly__btn c-friendly__btn--gold" type="button" onClick={onAdd}>הוספה לסל</button>
      </div>
      <a href={z11.shopUrl}>קנייה בחנות זיקה</a>
      <a href={quoteMailto([`${z11.model} · ${selected.sku} · כמות ${qty}`])}>בקשת הצעת מחיר B2B</a>
    </aside>
  );
}

function SpecCard({ label, value }: { readonly label: string; readonly value: string }) {
  return <article><span>{label}</span><strong><bdi>{value}</bdi></strong></article>;
}

function DataTable({ title, headers, rows }: { readonly title: string; readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] }) {
  return (
    <div className="c-friendly__table-card">
      <h3>{title}</h3>
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.join('-')}>{row.map((cell) => <td key={cell}><bdi>{cell}</bdi></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function DiameterTable() {
  const rows = [...z11.variants.map((variant) => ({ ...variant, price: formatIls(variant.priceIls), sold: 'נמכר אונליין' })), { sku: 'Z11-50', diameterMm: z11.datasheetOnly.diameterMm, diameterIn: z11.datasheetOnly.diameterIn, lengthMm: z11.datasheetOnly.lengthMm, currentA: z11.datasheetOnly.currentA, packKg: '-', packaging: '-', price: '—', sold: 'לא נמכר אונליין' }];
  return (
    <div className="c-friendly__table-card c-friendly__table-card--wide">
      <h3>טבלת קטרים וזרמים</h3>
      <table>
        <thead><tr><th>קוטר</th><th>אינץ׳</th><th>אורך</th><th>זרם</th><th>אריזה</th><th>מחיר</th><th>זמינות</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.sku}><td><bdi>{row.diameterMm}</bdi> מ״מ</td><td><bdi>{row.diameterIn}</bdi></td><td><bdi>{row.lengthMm}</bdi></td><td><bdi>{row.currentA}</bdi>A</td><td>{row.packKg} ק״ג · {row.packaging}</td><td>{row.price}</td><td>{row.sold}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function certificationBadges(): readonly string[] {
  return [z11.awsShort, ...shopPromises.map((promise) => promise.label), ...['AWS', 'EN', 'CE']];
}

function Icon({ name }: { readonly name: IconName }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (name) {
    case 'catalog': return <svg {...common}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3-3V4Z" /><path d="M8 8h7M8 12h7" /></svg>;
    case 'videos': return <svg {...common}><rect x="4" y="6" width="16" height="12" rx="3" /><path d="m10 10 5 2-5 3v-5Z" /></svg>;
    case 'stores': return <svg {...common}><path d="M4 10h16l-2-5H6l-2 5Zm1 0v9h14v-9M9 19v-5h6v5" /></svg>;
    case 'college': return <svg {...common}><path d="m3 8 9-4 9 4-9 4-9-4Z" /><path d="M7 10v5c2 2 8 2 10 0v-5" /></svg>;
    case 'contact': return <svg {...common}><path d="M5 6h14v12H5z" /><path d="m5 7 7 6 7-6" /></svg>;
    case 'faq': return <svg {...common}><path d="M12 19a7 7 0 1 0-7-7" /><path d="M10 9a2 2 0 1 1 3 2c-1 .6-1 1-1 2" /><path d="M12 17h.01" /></svg>;
    case 'cart': return <svg {...common}><path d="M5 5h2l2 10h8l2-7H8" /><circle cx="10" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
    case 'menu': return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case 'close': return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case 'check': return <svg {...common}><path d="m5 12 4 4 10-10" /></svg>;
    case 'download': return <svg {...common}><path d="M12 4v10M8 10l4 4 4-4M5 20h14" /></svg>;
    case 'spark': return <svg {...common}><path d="m13 2-2 8 7-2-6 14 1-9-7 2 7-13Z" /></svg>;
    case 'pin': return <svg {...common}><path d="M12 21s6-5 6-11a6 6 0 0 0-12 0c0 6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
  }
}
