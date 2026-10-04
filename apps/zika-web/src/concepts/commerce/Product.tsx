import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, certifications, formatIls, photos, quoteMailto, z11 } from '../../content/index.ts';
import { useCart } from '../../lib/cart.tsx';
import { CommerceLayout, StandardsLine } from './shared.tsx';

const gallery = [
  { src: z11.image, alt: 'אריזת Z-11', w: 572, h: 466 },
  { src: photos.electrodeLmn.src, alt: 'אלקטרודת ריתוך', w: photos.electrodeLmn.w, h: photos.electrodeLmn.h },
  { src: photos.mildSteel.src, alt: 'אלקטרודות לפלדה', w: photos.mildSteel.w, h: photos.mildSteel.h },
] as const;

function ProductIntro() {
  const cart = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [sku, setSku] = useState(z11.variants[2].sku);
  const [qty, setQty] = useState(1);
  const variant = z11.variants.find((item) => item.sku === sku) ?? z11.variants[0];
  const total = variant.priceIls * qty;
  const selectedImage = gallery[activeImage];

  return (
    <section className="c-commerce__pdp-intro" id="overview">
      <nav className="c-commerce__breadcrumb" aria-label="פירורי לחם">
        <Link to="/commerce">בית</Link><span>›</span><a href={categories[0].href}>קטלוג</a><span>›</span><a href={categories[0].href}>אלקטרודות</a><span>›</span><bdi dir="ltr">{z11.model}</bdi>
      </nav>
      <div className="c-commerce__gallery">
        <div className="c-commerce__gallery-stage">
          <img src={selectedImage.src} alt={selectedImage.alt} width={selectedImage.w} height={selectedImage.h} />
        </div>
        <div className="c-commerce__thumbs" aria-label="תמונות מוצר">
          {gallery.map((image, index) => (
            <button key={image.src} type="button" aria-current={activeImage === index} onClick={() => setActiveImage(index)}>
              <img src={image.src} alt="" width={image.w} height={image.h} />
            </button>
          ))}
        </div>
      </div>
      <div className="c-commerce__buy-box" id="order">
        <h1><bdi dir="ltr">{z11.model}</bdi> {z11.name.replace(z11.model, '')}</h1>
        <p>{z11.oneLiner}</p>
        <dl className="c-commerce__classifications">
          <div><dt>AWS</dt><dd><bdi dir="ltr">{z11.aws}</bdi></dd></div>
          <div><dt>ISO</dt><dd><bdi dir="ltr">{z11.iso}</bdi></dd></div>
          <div><dt>יישומים</dt><dd>{z11.applications.join(' · ')}</dd></div>
        </dl>
        <fieldset className="c-commerce__variants">
          <legend>בחירת קוטר</legend>
          {z11.variants.map((item) => (
            <label key={item.sku}>
              <input type="radio" name="diameter" checked={sku === item.sku} onChange={() => setSku(item.sku)} />
              <span><bdi dir="ltr">{item.diameterMm} מ״מ</bdi></span>
              <small><bdi dir="ltr">{item.currentA}A</bdi> · {item.packKg} ק״ג · {formatIls(item.priceIls)}</small>
            </label>
          ))}
        </fieldset>
        <div className="c-commerce__purchase-row">
          <div className="c-commerce__qty-stepper" aria-label="כמות">
            <button type="button" onClick={() => setQty((value) => Math.max(1, value - 1))}>−</button>
            <output>{qty}</output>
            <button type="button" onClick={() => setQty((value) => Math.min(99, value + 1))}>+</button>
          </div>
          <strong><bdi dir="ltr">{formatIls(total)}</bdi></strong>
        </div>
        <button className="c-commerce__button c-commerce__button--primary" type="button" onClick={() => cart.add(variant.sku, qty)}>הוסף לעגלה</button>
        <a className="c-commerce__button c-commerce__button--ghost" href={z11.shopUrl}>קנייה בחנות זיקה</a>
        <a className="c-commerce__quote" href={quoteMailto([`בקשת הצעת מחיר עבור ${variant.sku}`, `כמות: ${qty}`])}>בקשת הצעת מחיר</a>
        <p className="c-commerce__shipping-note">{z11.shipping.label}: <bdi dir="ltr">{formatIls(z11.shipping.priceIls)}</bdi></p>
      </div>
    </section>
  );
}

function AnchorBar() {
  const cart = useCart();
  return (
    <nav className="c-commerce__anchor-bar" aria-label="ניווט בעמוד מוצר">
      <a href="#overview">סקירה</a>
      <a href="#benefits">יתרונות</a>
      <a href="#specs">מפרט</a>
      <a href="#order">הזמנה</a>
      <a href="#docs">מסמכים</a>
      <a className="c-commerce__anchor-quote" href={quoteMailto(['בקשת הצעת מחיר עבור Z-11'])}>בקשת הצעת מחיר</a>
      <button type="button" onClick={() => cart.add(z11.variants[2].sku, 1)}>הוסף לעגלה</button>
    </nav>
  );
}

function Benefits() {
  const rows = [
    { title: 'ריתוך בכל המצבים', body: `${z11.description[0]} ${z11.applications.join(' · ')}.`, image: photos.electrodeLmn.src },
    { title: 'עבודה נקייה יותר', body: 'התזה מועטת והסרת סיגים קלה, לפי נתוני המוצר המקוריים.', image: photos.sparksWarm.src },
    { title: z11.lowMnSibling.model, body: z11.lowMnSibling.line, image: photos.factoryLab.src, href: z11.lowMnSibling.href },
  ] as const;
  return (
    <section className="c-commerce__pdp-section c-commerce__benefits" id="benefits">
      <h2>יתרונות ושימושים</h2>
      {rows.map((row) => (
        <article key={row.title}>
          <img src={row.image} alt="" loading="lazy" />
          <div>
            <h3>{row.title}</h3>
            <p>{row.body}</p>
            {'href' in row && <a href={row.href}>למידע על הסדרה הירוקה</a>}
          </div>
        </article>
      ))}
    </section>
  );
}

function Specs() {
  const diameterRows = useMemo(() => [...z11.variants, { ...z11.datasheetOnly, sku: 'datasheet-only', packKg: 0, priceIls: 0, packaging: 'קרטון' as const }], []);
  return (
    <section className="c-commerce__pdp-section c-commerce__specs" id="specs">
      <h2>מפרט טכני</h2>
      <div className="c-commerce__spec-grid">
        <table>
          <caption>הרכב כימי</caption>
          <tbody>{z11.chemistry.map((item) => <tr key={item.el}><th><bdi dir="ltr">{item.el}</bdi> {item.name}</th><td><bdi dir="ltr">{item.pct}%</bdi></td></tr>)}</tbody>
        </table>
        <table>
          <caption>תכונות מכניות</caption>
          <tbody>{z11.mechanical.map((item) => <tr key={item.label}><th>{item.label}</th><td><bdi dir="ltr">{item.value} {item.unit}</bdi></td></tr>)}</tbody>
        </table>
      </div>
      <table className="c-commerce__diameter-table">
        <caption>קטרים, זרמים ואריזות</caption>
        <thead><tr><th>מק״ט</th><th>קוטר</th><th>אינץ׳</th><th>אורך</th><th>זרם</th><th>אריזה</th><th>מחיר</th></tr></thead>
        <tbody>
          {diameterRows.map((item) => (
            <tr key={item.sku}>
              <td>{item.sku === 'datasheet-only' ? 'דף נתונים בלבד' : <bdi dir="ltr">{item.sku}</bdi>}</td>
              <td><bdi dir="ltr">{item.diameterMm} מ״מ</bdi></td>
              <td><bdi dir="ltr">{item.diameterIn}</bdi></td>
              <td><bdi dir="ltr">{item.lengthMm} מ״מ</bdi></td>
              <td><bdi dir="ltr">{item.currentA}A</bdi></td>
              <td>{item.sku === 'datasheet-only' ? 'לא נמכר אונליין' : `${item.packKg} ק״ג · ${item.packaging}`}</td>
              <td>{item.sku === 'datasheet-only' ? '—' : <bdi dir="ltr">{formatIls(item.priceIls)}</bdi>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="c-commerce__tech-list">
        <div><dt>ציפוי</dt><dd>{z11.coating}</dd></div>
        <div><dt>זרם</dt><dd><bdi dir="ltr">{z11.current}</bdi></dd></div>
        <div><dt>מצבי ריתוך</dt><dd>{z11.positions}</dd></div>
        <div><dt>ייבוש מוקדם</dt><dd>{z11.preDrying}</dd></div>
        <div><dt>אריזה</dt><dd>{z11.packagingNote}</dd></div>
      </dl>
    </section>
  );
}

function Documents() {
  return (
    <section className="c-commerce__pdp-section c-commerce__docs" id="docs">
      <h2>מסמכים, אישורים ומוצרים קשורים</h2>
      <StandardsLine />
      <div className="c-commerce__doc-actions">
        <a className="c-commerce__button c-commerce__button--primary" href={z11.datasheetPdf}>הורדת דף נתונים</a>
        <a className="c-commerce__button c-commerce__button--ghost" href={z11.lowMnPdf}>דף נתונים LMn</a>
        <a className="c-commerce__button c-commerce__button--ghost" href={certifications.certificatesUrl}>תעודות איכות</a>
      </div>
      <div className="c-commerce__family-grid">
        {z11.family.map((item) => (
          <a key={item.model} href={item.href}>
            {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="c-commerce__family-placeholder" />}
            <strong><bdi dir="ltr">{item.model}</bdi></strong>
            <span>{item.aws} · {item.use}</span>
            {item.price && <em>{item.price}</em>}
          </a>
        ))}
      </div>
    </section>
  );
}

export function Product() {
  return (
    <CommerceLayout>
      <main>
        <ProductIntro />
        <AnchorBar />
        <Benefits />
        <Specs />
        <Documents />
      </main>
    </CommerceLayout>
  );
}
