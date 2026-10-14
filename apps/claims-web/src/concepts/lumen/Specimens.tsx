import { checks } from '../../content/index.ts';
import { useLang } from '../../lib/i18n.tsx';
import { invoice, photo, traces } from './copy.ts';

const NUM: Record<string, number> = Object.fromEntries(checks.map((c, i) => [c.key, i + 1]));

// Rendered twice: once as the plain table, once as the UV layer revealed under the lamp. Layout must stay identical.
export function Specimens({ uv }: { readonly uv: boolean }) {
  const { t } = useLang();

  const mark = (key: string) =>
    uv ? (
      <span className={`lm-mark lm-mark--${key}`} data-mark={key}>
        <b className="lm-mark__n">{NUM[key]}</b>
        <span>{t(traces[key])}</span>
      </span>
    ) : null;

  return (
    <div className="lm-specimens">
      <figure className="lm-spec lm-spec--invoice">
        <figcaption className="lm-tag">{t(invoice.exhibit)}</figcaption>
        <div className="lm-doc lm-invoice">
          <div className="lm-inv-head">
            <div className="lm-inv-name">{t(invoice.name)}</div>
            <div className="lm-inv-addr">{t(invoice.address)}</div>
            <div className="lm-t lm-t--registry lm-inv-lic">
              {t(invoice.licenseLabel)} <span className="lm-mono">{invoice.license}</span>
              {mark('registry')}
            </div>
          </div>
          <div className="lm-inv-meta">
            <span>{t(invoice.title)}</span>
            <span className="lm-mono">{invoice.number}</span>
          </div>
          <div className="lm-inv-dateRow">
            <span className="lm-t lm-t--context lm-inv-date">
              {t(invoice.date)}
              {mark('context')}
            </span>
          </div>
          <table className="lm-inv-lines">
            <thead>
              <tr>
                <th>{t(invoice.item)}</th>
                <th>{t(invoice.qty)}</th>
                <th>{t(invoice.sum)}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.sum}>
                  <td>{t(l.name)}</td>
                  <td>{l.qty}</td>
                  <td dir="ltr">{l.sum}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="lm-inv-total">
            <span>{t(invoice.total)}</span>
            <strong dir="ltr">
              {t(invoice.currency)}
              <span className="lm-t lm-t--pixels lm-forged">
                1,8
                {mark('pixels')}
              </span>
              40.00
            </strong>
          </div>
          <div className="lm-inv-foot">
            <span className="lm-t lm-t--duplicates lm-stampwrap">
              {uv && (
                <>
                  <span className="lm-stamp lm-stamp--ghost lm-stamp--g1" />
                  <span className="lm-stamp lm-stamp--ghost lm-stamp--g2" />
                  <span className="lm-stamp lm-stamp--ghost lm-stamp--g3" />
                </>
              )}
              <span className="lm-stamp">
                <span>{t(invoice.stamp)}</span>
              </span>
              {mark('duplicates')}
            </span>
            <svg className="lm-sign" viewBox="0 0 120 40" aria-hidden="true">
              <path d="M6 30c8-18 16-22 20-12s-8 14 0 10 14-22 20-14-4 12 6 8 8-14 16-8 6 10 14 4 12-8 30-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </figure>

      <figure className="lm-spec lm-spec--photo">
        <figcaption className="lm-tag">{t(photo.exhibit)}</figcaption>
        <div className="lm-doc lm-photo">
          <div className="lm-photo-head">
            <span>
              {t(photo.claim)} <span className="lm-mono">{photo.claimId}</span>
            </span>
            <span>{t(photo.reported)}</span>
          </div>
          <div className="lm-t lm-t--photos lm-photo-img">
            <CarPhoto />
            {uv && <span className="lm-clone" />}
            {mark('photos')}
          </div>
          <dl className="lm-exif">
            {photo.exif.map((row) => (
              <div key={row.key} className={row.key === 'taken' ? 'lm-t lm-t--metadata' : undefined}>
                <dt>{t(row.label)}</dt>
                <dd className="lm-mono" dir="ltr">
                  {row.value}
                </dd>
              </div>
            ))}
            <div className="lm-ink">
              <dt>{t(photo.softwareLabel)}</dt>
              <dd className="lm-mono" dir="ltr">
                {photo.software}
              </dd>
              {mark('metadata')}
            </div>
          </dl>
        </div>
      </figure>
    </div>
  );
}

function CarPhoto() {
  return (
    <svg className="lm-car" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fa3b8" />
          <stop offset="1" stopColor="#d9dfe4" />
        </linearGradient>
        <linearGradient id="lm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d2dc" />
          <stop offset="0.55" stopColor="#8e9aa8" />
          <stop offset="1" stopColor="#5e6977" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#lm-sky)" />
      <rect y="150" width="400" height="90" fill="#6b6f74" />
      <path d="M0 196h400" stroke="#8a8e93" strokeWidth="2" strokeDasharray="26 18" />
      <path
        d="M14 176 L24 128 Q32 108 70 102 L132 96 Q160 62 210 58 L292 58 Q326 60 346 92 L378 100 Q392 104 392 122 L392 170 Q392 180 382 180 L22 180 Q14 180 14 176 Z"
        fill="url(#lm-body)"
        stroke="#4b5561"
        strokeWidth="1.5"
      />
      <path d="M148 96 Q170 70 210 66 L250 66 L250 96 Z" fill="#3c4855" />
      <path d="M260 66 L290 66 Q318 68 334 94 L260 96 Z" fill="#3c4855" />
      <path d="M24 136 H388" stroke="#eef2f6" strokeOpacity="0.5" strokeWidth="2" />
      <rect x="370" y="112" width="18" height="12" rx="2" fill="#c0392b" />
      <path d="M336 128 q14 10 8 30 M350 126 q6 18 -6 36 M330 146 l26 4" stroke="#3b434d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="350" cy="148" rx="26" ry="18" fill="#2f3741" opacity="0.35" />
      <path d="M322 160 l40 -6 M328 168 l30 -4" stroke="#e8edf2" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="96" cy="180" r="28" fill="#23272c" />
      <circle cx="96" cy="180" r="12" fill="#9aa3ad" />
      <circle cx="306" cy="180" r="28" fill="#23272c" />
      <circle cx="306" cy="180" r="12" fill="#9aa3ad" />
    </svg>
  );
}
