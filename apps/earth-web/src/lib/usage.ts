import { isRecord, readJson, writeJson } from './storage';

export type UsageSku = 'tiles3d' | 'tiles2d' | 'autocomplete' | 'placeDetails';

export type SkuInfo = {
  readonly id: UsageSku;
  readonly label: string;
  readonly unit: string;
  readonly freeCap: number; // free events per calendar month
  readonly pricePer1000: number; // USD, first paid tier
};

export type UsageCounts = Readonly<Record<UsageSku, number>>;

export type MonthlyUsage = {
  readonly month: string; // Format: "YYYY-MM"
  readonly counts: UsageCounts;
};

export type SkuCost = {
  readonly sku: SkuInfo;
  readonly count: number;
  readonly billable: number;
  readonly cost: number;
};

// https://developers.google.com/maps/billing-and-pricing/pricing
export const SKUS: readonly SkuInfo[] = [
  { id: 'tiles3d', label: 'Photorealistic 3D Tiles', unit: 'sessions', freeCap: 1_000, pricePer1000: 6 },
  { id: 'tiles2d', label: '2D Map Tiles', unit: 'tiles', freeCap: 100_000, pricePer1000: 0.6 },
  { id: 'autocomplete', label: 'Places Autocomplete', unit: 'requests', freeCap: 10_000, pricePer1000: 2.83 },
  { id: 'placeDetails', label: 'Place Details (Pro)', unit: 'lookups', freeCap: 5_000, pricePer1000: 17 },
];

const STORAGE_KEY = 'usage';
const FLUSH_DELAY_MS = 2_000;

export const emptyCounts = (): UsageCounts => ({ tiles3d: 0, tiles2d: 0, autocomplete: 0, placeDetails: 0 });

export const monthKey = (date: Date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export function classifyUrl(url: string): UsageSku | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'tile.googleapis.com') return null;
  // Only the root tileset request is billed; tiles fetched inside its ~3h session are free.
  if (parsed.pathname === '/v1/3dtiles/root.json') return 'tiles3d';
  if (/^\/v1\/2dtiles\/\d+\/\d+\/\d+$/.test(parsed.pathname)) return 'tiles2d';
  return null;
}

export function estimateCost(counts: UsageCounts): { readonly items: readonly SkuCost[]; readonly total: number } {
  const items = SKUS.map((sku) => {
    const count = counts[sku.id];
    const billable = Math.max(0, count - sku.freeCap);
    return { sku, count, billable, cost: (billable / 1000) * sku.pricePer1000 };
  });
  return { items, total: items.reduce((sum, item) => sum + item.cost, 0) };
}

const isCounts = (value: unknown): value is UsageCounts =>
  isRecord(value) && SKUS.every((sku) => typeof value[sku.id] === 'number' && Number.isFinite(value[sku.id]) && (value[sku.id] as number) >= 0);

const isMonthlyUsage = (value: unknown): value is MonthlyUsage => isRecord(value) && typeof value.month === 'string' && isCounts(value.counts);

export function readUsage(now: Date = new Date(), storage?: Storage): MonthlyUsage {
  const month = monthKey(now);
  const stored = readJson<MonthlyUsage | null>(STORAGE_KEY, null, (v): v is MonthlyUsage | null => isMonthlyUsage(v), storage);
  return stored && stored.month === month ? stored : { month, counts: emptyCounts() };
}

export function addUsage(usage: MonthlyUsage, delta: Partial<UsageCounts>, now: Date = new Date()): MonthlyUsage {
  const month = monthKey(now);
  const base = usage.month === month ? usage.counts : emptyCounts();
  const counts = { ...base };
  for (const sku of SKUS) counts[sku.id] = Math.max(0, base[sku.id] + (delta[sku.id] ?? 0));
  return { month, counts };
}

// In-memory deltas are merged into storage on flush so several open tabs add up instead of overwriting each other.
let pending: Partial<Record<UsageSku, number>> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let snapshot: MonthlyUsage | null = null;
const listeners = new Set<() => void>();
const autocompleteBySession = new Map<string, number>();
let started = false;

function notify(): void {
  snapshot = null;
  listeners.forEach((listener) => listener());
}

function flush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (!Object.keys(pending).length) return;
  writeJson(STORAGE_KEY, addUsage(readUsage(), pending));
  pending = {};
}

function record(sku: UsageSku, amount = 1): void {
  pending[sku] = (pending[sku] ?? 0) + amount;
  if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  notify();
}

export function recordAutocomplete(sessionToken: string): void {
  autocompleteBySession.set(sessionToken, (autocompleteBySession.get(sessionToken) ?? 0) + 1);
  record('autocomplete');
}

// A session that ends in Place Details makes its autocomplete requests free ("Autocomplete Session Usage").
export function recordPlaceDetails(sessionToken: string): void {
  const sessionRequests = autocompleteBySession.get(sessionToken) ?? 0;
  autocompleteBySession.delete(sessionToken);
  if (sessionRequests) record('autocomplete', -sessionRequests);
  record('placeDetails');
}

export function getUsage(): MonthlyUsage {
  snapshot ??= addUsage(readUsage(), pending);
  return snapshot;
}

export function subscribeUsage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetUsage(): void {
  pending = {};
  autocompleteBySession.clear();
  writeJson(STORAGE_KEY, { month: monthKey(), counts: emptyCounts() });
  notify();
}

export function startUsageTracking(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (typeof PerformanceObserver !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        // transferSize 0 with a body means a browser-cache hit (only detectable when the server allows timing).
        if (entry.transferSize === 0 && entry.decodedBodySize > 0) continue;
        const sku = classifyUrl(entry.name);
        if (sku) record(sku);
      }
    });
    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      // Resource timing unsupported.
    }
  }
  window.addEventListener('storage', (event) => {
    if (event.key?.endsWith(STORAGE_KEY)) notify();
  });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
