import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ZIKA_SITE,
  brand,
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
  photos,
  quoteMailto,
  z11,
} from '../../content/index.ts';
import { useCart } from '../../lib/cart.tsx';
import { CommerceLayout, PromiseStrip, StandardsLine } from './shared.tsx';

const slides = [
  {
    id: 'hero',
    title: brand.tagline,
    body: `זיקה תעשיות מייצרת בישראל מאז ${brand.founded} פתרונות ריתוך לתעשייה, למסגריות ולשטח.`,
    image: photos.hero.src,
    cta: 'לקטלוג המוצרים',
    href: ZIKA_SITE,
    align: 'center',
  },
  {
    id: 'z11',
    title: 'Z-11 והסדרה הירוקה',
    body: `${z11.oneLiner} לצד סדרת LMn לפליטה מופחתת של נדפי מנגן.`,
    image: z11.image,
    cta: 'לצפייה ב-Z-11',
    to: '/commerce/product/z-11',
    align: 'product',
  },
  {
    id: 'catalog',
    title: catalog.title,
    body: `${migatronic.line} קטלוגים ומשאבים מקצועיים זמינים במקום אחד.`,
    image: catalog.image,
    cta: 'פתיחת הקטלוג',
    href: catalog.href,
    align: 'catalog',
  },
] as const;

const tabs = [
  { id: 'recommended', label: 'מומלצים', products: featuredProducts },
  { id: 'electrodes', label: 'אלקטרודות', products: [{ id: z11.id, name: z11.model, kind: z11.category, pitch: z11.oneLiner, facts: [z11.awsShort, z11.positions, `החל מ-${formatIls(Math.min(...z11.variants.map((variant) => variant.priceIls)))}`], image: z11.image, href: '/commerce/product/z-11' }] },
  { id: 'safety', label: 'ציוד מגן', products: featuredProducts.filter((product) => product.id === 'panor-w') },
] as const;

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[index];

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 6000);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section className="c-commerce__hero" aria-roledescription="carousel" aria-label="חדשות וזיקה">
      <div className={`c-commerce__hero-media c-commerce__hero-media--${slide.align}`}>
        <img src={slide.image} alt="" width={slide.id === 'hero' ? 2000 : undefined} height={slide.id === 'hero' ? 754 : undefined} />
      </div>
      <div className="c-commerce__hero-panel">
        <h1>{slide.title}</h1>
        <p>{slide.body}</p>
        {'to' in slide ? <Link className="c-commerce__button c-commerce__button--primary" to={slide.to}>{slide.cta}</Link> : <a className="c-commerce__button c-commerce__button--primary" href={slide.href}>{slide.cta}</a>}
      </div>
      <div className="c-commerce__hero-controls" aria-label="בקרת סליידר">
        <button type="button" onClick={() => setIndex((index + slides.length - 1) % slides.length)}>הקודם</button>
        <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? 'הפעל' : 'השהה'}</button>
        <button type="button" onClick={() => setIndex((index + 1) % slides.length)}>הבא</button>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section className="c-commerce__section c-commerce__categories" aria-labelledby="commerce-categories-title">
      <div className="c-commerce__section-head">
        <h2 id="commerce-categories-title">קטגוריות מוצרים</h2>
        <a href={ZIKA_SITE}>כל הקטלוג</a>
      </div>
      <div className="c-commerce__bubble-row">
        {categories.slice(0, 8).map((category) => (
          <a key={category.id} href={category.href} className="c-commerce__category-bubble">
            <span><img src={category.image} alt="" width="195" height="134" loading="lazy" /></span>
            <strong>{category.short}</strong>
          </a>
        ))}
      </div>
    </section>
  );
}

function ProductShelf() {
  const [active, setActive] = useState<(typeof tabs)[number]['id']>('recommended');
  const tab = tabs.find((item) => item.id === active) ?? tabs[0];
  return (
    <section className="c-commerce__section c-commerce__shelf" aria-labelledby="commerce-shelf-title">
      <div className="c-commerce__section-head">
        <h2 id="commerce-shelf-title">מוצרים אחרונים ומומלצים</h2>
        <div className="c-commerce__tabs" role="tablist" aria-label="סינון מוצרים">
          {tabs.map((item) => (
            <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={active === item.id} onClick={() => setActive(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="c-commerce__product-grid">
        {tab.products.map((product) => {
          const isInternal = product.href.startsWith('/');
          const content = (
            <>
              <img src={product.image} alt={product.name} loading="lazy" />
              <div>
                <strong>{product.name}</strong>
                <span>{product.kind}</span>
                <p>{product.pitch}</p>
                <ul>{product.facts.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}</ul>
              </div>
            </>
          );
          return isInternal ? <Link key={product.id} className="c-commerce__product-card" to={product.href}>{content}</Link> : <a key={product.id} className="c-commerce__product-card" href={product.href}>{content}</a>;
        })}
      </div>
    </section>
  );
}

function Z11Spotlight() {
  const cart = useCart();
  const cheapest = useMemo(() => z11.variants.reduce((min, variant) => Math.min(min, variant.priceIls), Number.POSITIVE_INFINITY), []);
  return (
    <section className="c-commerce__spotlight">
      <div>
        <h2><bdi dir="ltr">{z11.model}</bdi> לריתוך מבנים</h2>
        <p>{z11.description.join(' ')}</p>
        <div className="c-commerce__spot-actions">
          <Link className="c-commerce__button c-commerce__button--primary" to="/commerce/product/z-11">עמוד מוצר</Link>
          <button className="c-commerce__button c-commerce__button--ghost" type="button" onClick={() => cart.add(z11.variants[2].sku, 1)}>הוסף לעגלה</button>
        </div>
      </div>
      <img src={z11.image} alt="אריזת Z-11" width="572" height="466" loading="lazy" />
      <aside>
        <strong>החל מ-<bdi dir="ltr">{formatIls(cheapest)}</bdi></strong>
        <span>{z11.aws}</span>
        <span>{z11.iso}</span>
      </aside>
    </section>
  );
}

function About() {
  return (
    <section className="c-commerce__about" aria-labelledby="commerce-about-title">
      <div>
        <h2 id="commerce-about-title">ייצור כחול־לבן, תקינה בינלאומית</h2>
        <p>{`${brand.legalName} ${brand.founded}: ${brand.tagline}. ${z11.oneLiner}`}</p>
        <p>{`${contacts[1].dept} וזמינות מכירות מסייעים לבחור פתרון טכני נכון.`}</p>
        <StandardsLine />
      </div>
      <div className="c-commerce__about-copy">
        <p>{international.headline}</p>
        <p>{industries.slice(0, 7).join(' · ')}</p>
      </div>
    </section>
  );
}

function IndustryBanner() {
  return (
    <section className="c-commerce__industry">
      <img src={photos.sparks.src} alt="ריתוך בתעשייה" width="689" height="304" loading="lazy" />
      <div>
        <h2>פתרונות ריתוך לתעשיות כבדות ושטח</h2>
        <p>{industries.join(' · ')}</p>
      </div>
    </section>
  );
}

function Resources() {
  const cards = [
    { title: 'ספר הדרכה טכני', image: 'banner-videos.png', href: knowledge[1].href },
    { title: 'PANOR W', image: 'banner-panoramic.png', href: featuredProducts[0].href },
    { title: migatronic.name, image: 'banner-migatronic.jpg', href: migatronic.href },
    { title: catalog.title, image: 'banner-catalog-2026.jpg', href: catalog.href },
  ] as const;
  return (
    <section className="c-commerce__section c-commerce__resources" aria-labelledby="commerce-resources-title">
      <div className="c-commerce__section-head">
        <h2 id="commerce-resources-title">חדשות ומשאבים</h2>
        <a href={knowledge[0].href}>מרכז הידע</a>
      </div>
      <div className="c-commerce__resource-grid">
        {cards.map((card) => (
          <a key={card.title} href={card.href}>
            <img src={`${import.meta.env.BASE_URL}assets/${card.image}`} alt="" loading="lazy" />
            <strong>{card.title}</strong>
          </a>
        ))}
      </div>
    </section>
  );
}

function CompactPrograms() {
  return (
    <section className="c-commerce__programs">
      <a href={greenSeries.url}>
        <strong>{greenSeries.name}</strong>
        <span>{greenSeries.claim}</span>
      </a>
      <a href={college.href}>
        <strong>{college.full}</strong>
        <span>{college.tracksLine}</span>
      </a>
      <a href={international.url}>
        <strong>{international.headline}</strong>
        <span>{international.regions.map((region) => region.name).join(' · ')}</span>
      </a>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    window.location.href = quoteMailto(['שם:', 'טלפון:', 'הודעה:']);
  };
  return (
    <section className="c-commerce__contact" aria-labelledby="commerce-contact-title">
      <div>
        <h2 id="commerce-contact-title">צריכים התאמה או הצעת מחיר?</h2>
        <p>השאירו פרטים, או פנו ישירות למחלקת המכירות של זיקה.</p>
        <a href={`mailto:${contacts[0].email}`}>{contacts[0].email}</a>
      </div>
      <form onSubmit={submit}>
        <label>שם<input required name="name" /></label>
        <label>טלפון<input required name="phone" inputMode="tel" /></label>
        <label>הודעה<textarea required name="message" rows={3} /></label>
        <button className="c-commerce__button c-commerce__button--primary" type="submit">שליחת בקשה</button>
        {sent && <p role="status">הטופס הוא הדגמה; נפתח מייל עם פרטי הבקשה.</p>}
      </form>
    </section>
  );
}

export function Home() {
  return (
    <CommerceLayout>
      <main>
        <HeroCarousel />
        <PromiseStrip />
        <Categories />
        <ProductShelf />
        <Z11Spotlight />
        <About />
        <IndustryBanner />
        <Resources />
        <CompactPrograms />
        <Contact />
      </main>
    </CommerceLayout>
  );
}
