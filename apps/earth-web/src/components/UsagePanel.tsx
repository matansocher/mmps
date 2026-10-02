import { useSyncExternalStore } from 'react';
import { estimateCost, getUsage, resetUsage, subscribeUsage } from '../lib/usage';
import { Drawer, SectionTitle } from './Drawer';
import { Icon } from './Icon';

const CONSOLE_URL = 'https://console.cloud.google.com/google/maps-apis/metrics';
const BILLING_URL = 'https://console.cloud.google.com/billing/reports';

const usd = (value: number): string => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = (value: number): string => value.toLocaleString('en-US');

export function UsagePanel({ onClose }: { readonly onClose: () => void }) {
  const usage = useSyncExternalStore(subscribeUsage, getUsage);
  const { items, total } = estimateCost(usage.counts);
  const monthLabel = new Date(`${usage.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const onReset = () => {
    if (window.confirm('Reset this month’s usage counters for this browser?')) resetUsage();
  };

  return (
    <Drawer title="API usage & cost" onClose={onClose}>
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs text-white/50">Estimated cost · {monthLabel}</div>
        <div className="text-3xl font-semibold tabular-nums">{usd(total)}</div>
        <div className="mt-1 text-xs text-white/45">{total === 0 ? 'Everything so far fits in Google’s free monthly amounts.' : 'Above the free monthly amounts, at first-tier prices.'}</div>
      </div>

      <SectionTitle>This month in this browser</SectionTitle>
      <ul className="space-y-4 px-4 pb-4">
        {items.map(({ sku, count: used, cost }) => {
          const pct = Math.min(100, (used / sku.freeCap) * 100);
          const over = used > sku.freeCap;
          return (
            <li key={sku.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{sku.label}</span>
                <span className={`tabular-nums ${cost > 0 ? 'text-amber-300' : 'text-white/60'}`}>{usd(cost)}</span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label={`${sku.label} free amount used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
              >
                <div className={`h-full rounded-full ${over ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${Math.max(pct, used ? 1 : 0)}%` }} />
              </div>
              <div className="mt-1 text-xs text-white/45 tabular-nums">
                {count(used)} / {count(sku.freeCap)} free {sku.unit} · then ${sku.pricePer1000.toFixed(2)} per 1,000
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mx-4 mb-4 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">
        Counted from the requests this browser made. It is an estimate: other devices and tabs that were never opened here are not included, and Google’s free amounts apply to your whole billing account. Searches that end with
        picking a result don’t pay for the autocomplete requests. Your exact bill is in Google Cloud.
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <a className="chip flex items-center gap-1.5" href={CONSOLE_URL} target="_blank" rel="noreferrer">
          <Icon name="usage" size={16} /> API metrics
        </a>
        <a className="chip flex items-center gap-1.5" href={BILLING_URL} target="_blank" rel="noreferrer">
          <Icon name="share" size={16} /> Billing report
        </a>
        <button type="button" className="chip flex items-center gap-1.5" onClick={onReset}>
          <Icon name="trash" size={16} /> Reset
        </button>
      </div>
    </Drawer>
  );
}
