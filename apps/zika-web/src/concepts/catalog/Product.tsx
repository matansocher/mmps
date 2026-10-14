import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogPage, PdfIcon, formatIls, quoteMailto, z11 } from './CatalogShell.tsx';
import { photos } from '../../content/index.ts';
import { useCart } from '../../lib/cart.tsx';

const anchors = [
  { id: 'overview', label: 'סקירה' },
  { id: 'benefits', label: 'יתרונות' },
  { id: 'technical', label: 'מפרט טכני' },
  { id: 'order', label: 'הזמנה' },
  { id: 'documents', label: 'מסמכים' },
] as const;

export function Product() {
  return (
    <CatalogPage>
      <ProductInner />
    </CatalogPage>
  );
}

function ProductInner() {
  const [sku, setSku] = useState(z11.variants[2].sku);
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState(z11.image);
  const cart = useCart();
  const selected = useMemo(() => z11.variants.find((variant) => variant.sku === sku) ?? z11.variants[0], [sku]);
  const quoteHref = quoteMailto([`${z11.model} · ${selected.diameterMm} מ״מ · ${selected.packKg} ק״ג · כמות ${qty}`]);

  return (
    <>
      <nav className="breadcrumbs section-shell" aria-label="פירורי לחם">
        <Link to="/catalog">בית</Link>
        <span>קטלוג</span>
        <span>אלקטרודות</span>
        <strong>{z11.model}</strong>
      </nav>

      <section className="pdp-hero section-shell" id="overview">
        <div className="pdp-gallery">
          <div className="product-stage">
            <img src={image} alt={image === z11.image ? `אריזת ${z11.model}` : 'תמונת יישום לריתוך'} width="572" height="466" />
          </div>
          <div className="thumbs" aria-label="בחירת תמונה">
            {[
              { src: z11.image, label: `אריזת ${z11.model}` },
              { src: photos.electrodeLmn.src, label: 'אלקטרודה מסדרת LMn' },
              { src: photos.sparks.src, label: 'ריתוך בתעשייה' },
            ].map((thumb) => (
              <button className={image === thumb.src ? 'is-active' : ''} key={thumb.src} type="button" onClick={() => setImage(thumb.src)}>
                <img src={thumb.src} alt={thumb.label} width="82" height="70" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="pdp-summary">
          <p className="back-link"><Link to="/catalog">חזרה לקטלוג הטכני</Link></p>
          <h1>{z11.name}</h1>
          <p className="pdp-one-liner">{z11.oneLiner}</p>
          <div className="badges" aria-label="תקנים וסיווגים">
            <span dir="ltr"><bdi>{z11.awsShort}</bdi></span>
            <span dir="ltr"><bdi>{z11.iso}</bdi></span>
            <span>{z11.coating}</span>
            <span>{z11.positions}</span>
          </div>
          <ul className="application-list">
            {z11.applications.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <aside className="buy-box" id="order">
          <h2>בחירת קוטר</h2>
          <p>מחיר נוכחי: <strong>{formatIls(selected.priceIls)}</strong></p>
          <div className="variant-select" role="radiogroup" aria-label="וריאנטים למוצר">
            {z11.variants.map((variant) => (
              <button
                key={variant.sku}
                type="button"
                role="radio"
                aria-checked={variant.sku === sku}
                className={variant.sku === sku ? 'is-selected' : ''}
                onClick={() => setSku(variant.sku)}
              >
                <span><bdi>{variant.diameterMm}</bdi> מ״מ</span>
                <small><bdi>{variant.currentA}</bdi>A · {variant.packKg} ק״ג</small>
                <strong>{formatIls(variant.priceIls)}</strong>
              </button>
            ))}
          </div>
          <div className="qty-row">
            <span>כמות</span>
            <div className="qty-mini">
              <button type="button" onClick={() => setQty((value) => Math.max(1, value - 1))}>-</button>
              <bdi>{qty}</bdi>
              <button type="button" onClick={() => setQty((value) => Math.min(99, value + 1))}>+</button>
            </div>
          </div>
          <button className="btn primary" type="button" onClick={() => cart.add(selected.sku, qty)}>הוסף לסל</button>
          <a className="btn secondary" href={z11.shopUrl}>קנייה בחנות זיקה</a>
          <a className="quote-link" href={quoteHref}>בקשת הצעת מחיר B2B</a>
          <p className="shipping-note">{z11.shipping.label}: {formatIls(z11.shipping.priceIls)}</p>
        </aside>
      </section>

      <nav className="anchor-tabs section-shell" aria-label="ניווט בעמוד מוצר">
        {anchors.map((anchor) => <a key={anchor.id} href={`#${anchor.id}`}>{anchor.label}</a>)}
      </nav>

      <section className="section-shell pdp-section" id="benefits">
        <div className="section-heading">
          <h2>הכל במבט אחד</h2>
          <p>סיכום יישומי, יתרונות שימוש ונתונים טכניים צפופים בלי להרגיש כמו גיליון נתונים.</p>
        </div>
        <div className="benefit-grid">
          {z11.description.map((item) => <article key={item}><p>{item}</p></article>)}
          <article><p>{z11.packagingNote}</p></article>
          <article><p>{z11.lowMnSibling.line}</p><a href={z11.lowMnSibling.href}>{z11.lowMnSibling.model}</a></article>
        </div>
      </section>

      <section className="section-shell technical-layout" id="technical">
        <div>
          <h2>טבלת וריאנטים</h2>
          <div className="table-scroll">
            <table className="product-table variant-table">
              <thead>
                <tr>
                  <th>קוטר</th>
                  <th>אינץ׳</th>
                  <th>אורך</th>
                  <th>זרם</th>
                  <th>אריזה</th>
                  <th>מחיר</th>
                </tr>
              </thead>
              <tbody>
                {z11.variants.map((variant) => (
                  <tr key={variant.sku} className={variant.sku === selected.sku ? 'is-selected' : ''} onClick={() => setSku(variant.sku)}>
                    <td><bdi>{variant.diameterMm}</bdi> מ״מ</td>
                    <td dir="ltr"><bdi>{variant.diameterIn}</bdi></td>
                    <td><bdi>{variant.lengthMm}</bdi> מ״מ</td>
                    <td dir="ltr"><bdi>{variant.currentA}</bdi>A</td>
                    <td>{variant.packKg} ק״ג · {variant.packaging}</td>
                    <td>{formatIls(variant.priceIls)}</td>
                  </tr>
                ))}
                <tr className="datasheet-only">
                  <td><bdi>{z11.datasheetOnly.diameterMm}</bdi> מ״מ</td>
                  <td dir="ltr"><bdi>{z11.datasheetOnly.diameterIn}</bdi></td>
                  <td><bdi>{z11.datasheetOnly.lengthMm}</bdi> מ״מ</td>
                  <td dir="ltr"><bdi>{z11.datasheetOnly.currentA}</bdi>A</td>
                  <td colSpan={2}>מופיע בדף מידע · לא נמכר אונליין</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="tech-cards">
          <article>
            <h3>נתוני ריתוך</h3>
            <dl>
              <div><dt>ציפוי</dt><dd>{z11.coating}</dd></div>
              <div><dt>זרם</dt><dd dir="ltr"><bdi>{z11.current}</bdi></dd></div>
              <div><dt>מצבים</dt><dd>{z11.positions}</dd></div>
              <div><dt>ייבוש מוקדם</dt><dd>{z11.preDrying}</dd></div>
            </dl>
          </article>
          <article>
            <h3>כימיה טיפוסית</h3>
            <table className="mini-table"><tbody>{z11.chemistry.map((row) => <tr key={row.el}><th dir="ltr"><bdi>{row.el}</bdi></th><td>{row.name}</td><td><bdi>{row.pct}</bdi>%</td></tr>)}</tbody></table>
          </article>
          <article>
            <h3>תכונות מכניות</h3>
            <dl>{z11.mechanical.map((row) => <div key={row.label}><dt>{row.label}</dt><dd><bdi>{row.value}</bdi> {row.unit}</dd></div>)}</dl>
          </article>
        </div>
      </section>

      <section className="section-shell documents-section" id="documents">
        <div>
          <h2>מסמכים וקישורים</h2>
          <p>כל מה שצריך להעביר לרכש, מהנדס או רתך בשטח.</p>
        </div>
        <div className="document-list">
          <a href={z11.datasheetPdf}><PdfIcon /> דף מידע Z-11</a>
          <a href={z11.lowMnPdf}><PdfIcon /> דף מידע Z-11 LMn</a>
          <a href={z11.siteUrl}>דף מוצר באתר זיקה</a>
          <a href={z11.shopUrl}>מוצר בחנות זיקה</a>
        </div>
      </section>

      <section className="section-shell family-section">
        <div className="section-heading">
          <h2>מוצרים קרובים במשפחה</h2>
          <p>מעבר מהיר לאלקטרודות קשורות מאותה משפחה.</p>
        </div>
        <div className="family-grid">
          {z11.family.map((item) => (
            <a href={item.href} key={item.model}>
              {item.image ? <img src={item.image} alt={item.model} width="160" height="130" loading="lazy" /> : <span className="family-placeholder">{item.model}</span>}
              <strong>{item.model}</strong>
              <span dir="ltr"><bdi>{item.aws}</bdi></span>
              <p>{item.use}</p>
            </a>
          ))}
        </div>
      </section>

      <div className="mobile-buybar" role="region" aria-label="פעולת קנייה מהירה">
        <button className="btn primary" type="button" onClick={() => cart.add(selected.sku, qty)}>הוסף לסל · {formatIls(selected.priceIls)}</button>
        <a className="btn secondary" href={quoteHref}>הצעת מחיר</a>
      </div>
    </>
  );
}
