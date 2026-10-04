import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CatalogPage,
  PdfIcon,
  QuickRail,
  SmartLink,
  asset,
  brand,
  catalog,
  categories,
  certifications,
  featuredProducts,
  formatIls,
  international,
  knowledge,
  migatronic,
  productRows,
  quoteMailto,
  storesUrl,
  z11,
} from './CatalogShell.tsx';
import { college, greenSeries, photos, story } from '../../content/index.ts';
import { useCart } from '../../lib/cart.tsx';

const filters = ['הכל', 'אלקטרודות', 'מכונות', 'בטיחות'] as const;

export function Home() {
  return (
    <CatalogPage>
      <HomeInner />
    </CatalogPage>
  );
}

function HomeInner() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('הכל');
  const [sent, setSent] = useState(false);
  const cart = useCart();
  const rows = useMemo(() => (filter === 'הכל' ? productRows : productRows.filter((row) => row.category === filter)), [filter]);

  const handleContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    window.location.href = quoteMailto(['פנייה מהקונספט: אשמח שנציג זיקה יחזור אליי.']);
  };

  return (
    <>
      <section className="hero-home section-shell">
        <QuickRail />
        <div className="hero-copy">
          <h1>קטלוג טכני מדויק למוצרי ריתוך ישראליים</h1>
          <p>{brand.tagline}. מאז <bdi>{brand.founded}</bdi>, זיקה מייצרת בישראל אלקטרודות וחוטי ריתוך לפי תקנים ישראליים ובינלאומיים.</p>
          <div className="hero-actions">
            <a className="btn primary" href={catalog.href}>הורדת קטלוג 2026–2027</a>
            <Link className="btn secondary" to="/catalog/product/z-11">צפייה ב-Z-11</Link>
          </div>
        </div>
        <div className="hero-visual" aria-label="תצוגת מוצרי זיקה">
          <img src={photos.hero.src} alt="מוצרי ריתוך זיקה ורתך בעבודה" width={photos.hero.w} height={photos.hero.h} />
        </div>
      </section>

      <section className="facts-band section-shell" aria-label="נתוני אמון">
        <div><strong><bdi>{brand.founded}</bdi></strong><span>שנת הקמה</span></div>
        <div><strong><bdi>{international.countryCount}+</bdi></strong><span>מדינות פעילות</span></div>
        <div><strong>{certifications.process.join(' · ')}</strong><span>אישורי תהליך</span></div>
        <div><strong>{certifications.standards.join(' · ')}</strong><span>תקני מוצר</span></div>
      </section>

      <section className="section-shell categories-section" id="categories">
        <div className="section-heading">
          <h2>משפחות מוצרים</h2>
          <p>כניסה מהירה למשפחות הקטלוג המרכזיות של זיקה.</p>
        </div>
        <div className="category-grid">
          {categories.slice(0, 8).map((category) => (
            <a className="category-tile" href={category.href} key={category.id}>
              <img src={category.image} alt={category.name} width="195" height="134" loading="lazy" />
              <span>{category.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="section-shell featured-section">
        <div className="section-heading">
          <h2>מוצרים נבחרים</h2>
          <p>מוצרים מרכזיים לצד כרטיס טכני מקוצר ל-Z-11.</p>
        </div>
        <div className="featured-grid">
          {featuredProducts.map((product) => (
            <a className="product-card" href={product.href} key={product.id}>
              <img src={product.image} alt={product.name} width="220" height="220" loading="lazy" />
              <h3>{product.name}</h3>
              <p>{product.pitch}</p>
              <ul>{product.facts.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}</ul>
            </a>
          ))}
          <article className="z11-card">
            <img src={z11.image} alt="אריזת Z-11" width="286" height="233" loading="lazy" />
            <div>
              <h3>{z11.name}</h3>
              <p>{z11.oneLiner}</p>
              <p className="price-line">החל מ-{formatIls(Math.min(...z11.variants.map((variant) => variant.priceIls)))}</p>
              <div className="card-actions">
                <Link className="btn secondary" to="/catalog/product/z-11">מפרט מלא</Link>
                <button className="btn primary" type="button" onClick={() => cart.add(z11.variants[0].sku, 1)}>הוסף לסל</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section-shell product-table-section" id="products">
        <div className="section-heading table-heading">
          <div>
            <h2>טבלת מוצרים מהירה</h2>
            <p>סינון לפי משפחה, תקנים וקישורי דפי מידע במקום אחד.</p>
          </div>
          <div className="filter-chips" role="tablist" aria-label="סינון מוצרים">
            {filters.map((item) => (
              <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="product-table">
            <thead>
              <tr>
                <th>שם מוצר</th>
                <th>תיאור קצר</th>
                <th><bdi>AWS</bdi></th>
                <th><bdi>EN ISO</bdi></th>
                <th>דף מידע</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.name}-${row.category}`}>
                  <td><strong>{row.name}</strong><span>{row.category}</span></td>
                  <td>{row.description}</td>
                  <td dir="ltr"><bdi>{row.aws ?? '—'}</bdi></td>
                  <td dir="ltr"><bdi>{row.iso ?? '—'}</bdi></td>
                  <td>{row.datasheet ? <a className="pdf-link" href={row.datasheet}><PdfIcon /> PDF</a> : '—'}</td>
                  <td><SmartLink row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-shell about-section">
        <div className="about-copy">
          <h2>ייצור כחול-לבן, תמיכה טכנית, בקרת איכות</h2>
          <p>{story.profile}</p>
          <p>{story.rnd}</p>
          <div className="trust-list">
            <strong>תחומי תעשייה</strong>
            <span>{industriesPreview()}</span>
          </div>
        </div>
        <div className="about-photos">
          <img src={photos.factoryRods.src} alt="קו ייצור אלקטרודות במפעל זיקה" width={photos.factoryRods.w} height={photos.factoryRods.h} loading="lazy" />
          <img src={photos.factoryLab.src} alt="מעבדת בקרת איכות בזיקה" width={photos.factoryLab.w} height={photos.factoryLab.h} loading="lazy" />
        </div>
      </section>

      <section className="section-shell resources-section">
        <div className="section-heading">
          <h2>חדשות ומשאבי ידע</h2>
          <p>קטלוגים, סרטוני הדרכה וקישורים שימושיים לאנשי רכש וריתוך.</p>
        </div>
        <div className="resource-grid">
          <a href={knowledge[1].href}><img src={asset('banner-videos.png')} alt="סרטוני הדרכה" width="287" height="198" loading="lazy" /><span>סרטוני הדרכה</span></a>
          <a href={featuredProducts[0].href}><img src={asset('banner-panoramic.png')} alt="מסכת PANOR W" width="287" height="198" loading="lazy" /><span>PANOR W</span></a>
          <a href={migatronic.href}><img src={migatronic.catalogImage} alt="קטלוג Migatronic" width="287" height="198" loading="lazy" /><span>{migatronic.name}</span></a>
          <a href={catalog.href}><img src={catalog.image} alt={catalog.title} width="287" height="198" loading="lazy" /><span>{catalog.title}</span></a>
        </div>
      </section>

      <section className="section-shell compact-row">
        <a className="compact-card green" href={greenSeries.url}>
          <h3>{greenSeries.name}</h3>
          <p>{greenSeries.claim}</p>
          <span>{greenSeries.products.join(' · ')}</span>
        </a>
        <a className="compact-card college" href={college.href}>
          <h3>{college.name}</h3>
          <p>{college.tracksLine}</p>
          <span>{college.phone}</span>
        </a>
        <a className="compact-card world" href={international.url}>
          <h3>{international.headline}</h3>
          <p>{international.regions.map((region) => region.name).join(' · ')}</p>
          <span>מפת פעילות</span>
        </a>
      </section>

      <section className="section-shell contact-section" id="contact">
        <div>
          <h2>צריכים התאמה טכנית?</h2>
          <p>השאירו פרטים או פנו ישירות למחלקת המכירות. הטופס בקונספט פותח הודעת מייל מוכנה.</p>
          <a href={storesUrl}>איתור חנות קרובה</a>
        </div>
        <form className="contact-form" onSubmit={handleContact}>
          <label>שם<input required name="name" autoComplete="name" /></label>
          <label>טלפון<input required name="phone" autoComplete="tel" /></label>
          <label>הודעה<textarea name="message" rows={4} defaultValue="אשמח להתייעץ לגבי מוצרי ריתוך של זיקה." /></label>
          <button className="btn primary" type="submit">שליחת פנייה</button>
          {sent ? <p role="status">נפתחה הודעת מייל לדוגמה. אין שליחה לשרת בקונספט.</p> : null}
        </form>
      </section>
    </>
  );
}

function industriesPreview() {
  return ['מספנות ימיות', 'צנרת ותשתיות', 'ציוד הנדסי כבד', 'חשמל ואנרגיה', 'פטרוכימיה, נפט וגז'].join(' · ');
}
