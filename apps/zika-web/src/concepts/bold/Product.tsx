import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatIls, photos, quoteMailto, z11 } from '../../content/index.ts';
import { useCart } from '../../lib/cart.tsx';
import { ContactBlock, Layout, Qty } from './shared.tsx';

const tabs = [
  { id: 'overview', label: 'סקירה' },
  { id: 'benefits', label: 'יתרונות' },
  { id: 'specs', label: 'מפרט טכני' },
  { id: 'order', label: 'הזמנה' },
  { id: 'docs', label: 'מסמכים' },
] as const;

const gallery = [
  { src: z11.image, alt: 'אריזת Z-11', w: 572, h: 466 },
  { src: photos.electrodeLmn.src, alt: 'אלקטרודה מסדרת Low Mn', w: photos.electrodeLmn.w, h: photos.electrodeLmn.h },
  { src: photos.mildSteel.src, alt: 'אלקטרודות לריתוך פלדה', w: photos.mildSteel.w, h: photos.mildSteel.h },
] as const;

export function Product() {
  const cart = useCart();
  const [selectedSku, setSelectedSku] = useState(z11.variants[2].sku);
  const [qty, setQty] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const selected = useMemo(() => z11.variants.find((variant) => variant.sku === selectedSku) ?? z11.variants[0], [selectedSku]);
  const quoteHref = quoteMailto([`${selected.sku} · קוטר ${selected.diameterMm} מ״מ · כמות ${qty}`]);

  return (
    <Layout page="product">
      <div className="c-bold__pdp">
        <div className="c-bold__breadcrumb">
          <div className="c-bold__breadcrumb-inner">
            <Link to="/bold">בית</Link>
            <span>›</span>
            <span>קטלוג</span>
            <span>›</span>
            <span>אלקטרודות</span>
            <span>›</span>
            <strong>Z-11</strong>
          </div>
        </div>

        <section className="c-bold__pdp-hero" id="order">
          <div className="c-bold__gallery">
            <div className="c-bold__thumbs" aria-label="תמונות מוצר">
              {gallery.map((image, index) => (
                <button className="c-bold__thumb" type="button" key={image.src} aria-pressed={galleryIndex === index} onClick={() => setGalleryIndex(index)}>
                  <img src={image.src} alt="" width={image.w} height={image.h} />
                </button>
              ))}
            </div>
            <div className="c-bold__stage">
              <img src={gallery[galleryIndex].src} alt={gallery[galleryIndex].alt} width={gallery[galleryIndex].w} height={gallery[galleryIndex].h} />
            </div>
          </div>

          <aside className="c-bold__buy" aria-label="בחירת מוצר וקנייה">
            <h1 className="c-bold__title">{z11.name}</h1>
            <div className="c-bold__standards">
              <span className="c-bold__standard">
                <bdi>{z11.aws}</bdi>
              </span>
              <span className="c-bold__standard">
                <bdi>{z11.iso}</bdi>
              </span>
            </div>
            <p>{z11.oneLiner}</p>
            <p>{z11.description[2]}</p>
            <div className="c-bold__docs">
              <a className="c-bold__doc" href={z11.datasheetPdf}>
                גיליון נתונים PDF
              </a>
              <a className="c-bold__doc" href={z11.lowMnPdf}>
                Low-Mn PDF
              </a>
            </div>

            <div className="c-bold__selector" role="radiogroup" aria-label="בחירת קוטר">
              {z11.variants.map((variant) => (
                <button className="c-bold__choice" type="button" key={variant.sku} aria-pressed={selectedSku === variant.sku} onClick={() => setSelectedSku(variant.sku)}>
                  <span>
                    <bdi>{variant.diameterMm}</bdi> מ״מ · <bdi>{variant.diameterIn}</bdi>
                    <br />
                    <small>
                      {variant.lengthMm} מ״מ · {variant.currentA}A · {variant.packKg} ק״ג · {variant.packaging}
                    </small>
                  </span>
                  <strong>{formatIls(variant.priceIls)}</strong>
                </button>
              ))}
            </div>

            <div className="c-bold__price">{formatIls(selected.priceIls)}</div>
            <div className="c-bold__order-row">
              <Qty value={qty} onChange={setQty} />
              <button className="c-bold__primary" data-bold-add-main type="button" onClick={() => cart.add(selected.sku, qty)}>
                הוספה לסל
              </button>
            </div>
            <p>
              {z11.shipping.label}: {formatIls(z11.shipping.priceIls)}
            </p>
            <div className="c-bold__cta-row">
              <a className="c-bold__ghost" href={z11.shopUrl}>
                קנייה בחנות זיקה
              </a>
              <a className="c-bold__ghost" href={quoteHref}>
                בקשת הצעת מחיר
              </a>
            </div>
          </aside>
        </section>

        <nav className="c-bold__tabs" aria-label="ניווט בדף המוצר">
          <div className="c-bold__tabs-inner">
            {tabs.map((tab) => (
              <a className="c-bold__tab" key={tab.id} href={`#${tab.id}`}>
                {tab.label}
              </a>
            ))}
          </div>
        </nav>

        <section className="c-bold__pdp-section c-bold__two-col" id="overview">
          <div>
            <h2>אלקטרודה רוטילית לעבודות יומיומיות</h2>
          </div>
          <div className="c-bold__about-copy">
            {z11.description.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className="c-bold__pdp-section" id="benefits">
          <div className="c-bold__section-head">
            <h2>יתרונות ושימושים</h2>
            <p>המידע המרכזי שקונה מקצועי צריך לפני מעבר להזמנה.</p>
          </div>
          <div className="c-bold__bullet-grid">
            {z11.applications.map((application) => (
              <div className="c-bold__bullet" key={application}>
                <strong>{application}</strong>
                <p>שימוש מתאים לפי נתוני המוצר של זיקה.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="c-bold__pdp-section" id="specs">
          <div className="c-bold__section-head">
            <h2>מפרט טכני</h2>
            <p>
              <bdi>{z11.aws}</bdi> · <bdi>{z11.iso}</bdi>
            </p>
          </div>
          <div className="c-bold__data-grid">
            <div className="c-bold__data">
              <strong>ציפוי</strong>
              <span>{z11.coating}</span>
            </div>
            <div className="c-bold__data">
              <strong>זרם</strong>
              <span>
                <bdi>{z11.current}</bdi>
              </span>
            </div>
            <div className="c-bold__data">
              <strong>מצבים</strong>
              <span>{z11.positions}</span>
            </div>
            <div className="c-bold__data">
              <strong>ייבוש מוקדם</strong>
              <span>{z11.preDrying}</span>
            </div>
          </div>

          <table className="c-bold__spec-table">
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
                <tr key={variant.sku}>
                  <td>
                    <bdi>{variant.diameterMm}</bdi> מ״מ
                  </td>
                  <td>
                    <bdi>{variant.diameterIn}</bdi>
                  </td>
                  <td>
                    <bdi>{variant.lengthMm}</bdi> מ״מ
                  </td>
                  <td>
                    <bdi>{variant.currentA}</bdi>A
                  </td>
                  <td>
                    {variant.packKg} ק״ג · {variant.packaging}
                  </td>
                  <td>{formatIls(variant.priceIls)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <bdi>{z11.datasheetOnly.diameterMm}</bdi> מ״מ
                </td>
                <td>
                  <bdi>{z11.datasheetOnly.diameterIn}</bdi>
                </td>
                <td>
                  <bdi>{z11.datasheetOnly.lengthMm}</bdi> מ״מ
                </td>
                <td>
                  <bdi>{z11.datasheetOnly.currentA}</bdi>A
                </td>
                <td colSpan={2}>מופיע בגיליון הנתונים · לא נמכר אונליין</td>
              </tr>
            </tbody>
          </table>

          <div className="c-bold__two-col c-bold__spec-split">
            <div>
              <h3>הרכב כימי</h3>
              <table className="c-bold__spec-table">
                <tbody>
                  {z11.chemistry.map((row) => (
                    <tr key={row.el}>
                      <th>
                        <bdi>{row.el}</bdi> · {row.name}
                      </th>
                      <td>
                        <bdi>{row.pct}</bdi>%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3>תכונות מכניות</h3>
              <table className="c-bold__spec-table">
                <tbody>
                  {z11.mechanical.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>
                        <bdi>{row.value}</bdi> {row.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="c-bold__lead">{z11.packagingNote}</p>
        </section>

        <section className="c-bold__pdp-section" id="docs">
          <div className="c-bold__section-head">
            <h2>מסמכים ומוצרים קרובים</h2>
            <p>{z11.lowMnSibling.line}</p>
          </div>
          <div className="c-bold__cta-row">
            <a className="c-bold__primary" href={z11.datasheetPdf}>
              הורדת גיליון נתונים
            </a>
            <a className="c-bold__ghost" href={z11.lowMnPdf}>
              הורדת Low-Mn
            </a>
            <a className="c-bold__ghost" href={z11.lowMnSibling.href}>
              {z11.lowMnSibling.model}
            </a>
          </div>
          <div className="c-bold__family c-bold__family-wrap">
            {z11.family.map((item) => (
              <a className="c-bold__family-card" key={item.model} href={item.href}>
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <div>
                  <strong>{item.model}</strong>
                  <p>
                    <bdi>{item.aws}</bdi> · {item.use}
                  </p>
                  {item.price && <span>{item.price}</span>}
                </div>
              </a>
            ))}
          </div>
        </section>

        <ContactBlock />

        <div className="c-bold__sticky-buy" aria-label="קנייה מהירה">
          <button className="c-bold__primary" type="button" onClick={() => cart.add(selected.sku, qty)}>
            הוספה לסל
          </button>
          <strong>{formatIls(selected.priceIls)}</strong>
        </div>
      </div>
    </Layout>
  );
}
