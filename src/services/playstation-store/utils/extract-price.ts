import { STANDALONE_BRANDING } from '../constants';
import type { PsStoreCache, PsStoreCacheEntry, PsStorePrice, PsStorePriceResponse } from '../types';

// The store page ships its Apollo cache split across one `env:*` script tag per widget.
const ENV_SCRIPT = /<script id="env:[^"]*" type="application\/json">([\s\S]*?)<\/script>/g;

// Prices hang off `GameCTA:*` cache entries, whose key embeds the product the price belongs to.
const GAME_CTA_PREFIX = 'GameCTA:';
const PRODUCT_REF_PREFIX = 'Product:';
const CONCEPT_REF_PREFIX = 'Concept:';

export function extractEmbeddedCaches(html: string): PsStoreCache[] {
  const caches: PsStoreCache[] = [];

  for (const match of html.matchAll(ENV_SCRIPT)) {
    try {
      const parsed = JSON.parse(match[1]) as { cache?: PsStoreCache };
      if (parsed?.cache) {
        caches.push(parsed.cache);
      }
    } catch {
      // A single malformed widget payload should not discard the rest of the page.
    }
  }

  return caches;
}

function walk(node: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, visit);
    }
    return;
  }

  if (node === null || typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;
  visit(record);
  for (const value of Object.values(record)) {
    walk(value, visit);
  }
}

function isPriceNode(node: Record<string, unknown>): boolean {
  return typeof node.basePriceValue === 'number' && typeof node.discountedValue === 'number';
}

// A concept page also lists special editions, bundles, add-on packs and virtual currency, each with
// its own price. Only the concept's default product is the base game, so prices are collected from
// the CTA entries referencing it — otherwise a cheap currency pack reads as a price drop.
export function collectPriceObjects(caches: readonly PsStoreCache[], productId?: string | null): PsStorePriceResponse[] {
  const found: PsStorePriceResponse[] = [];

  for (const cache of caches) {
    for (const [key, entry] of Object.entries(cache)) {
      if (productId && key.startsWith(GAME_CTA_PREFIX) && !key.includes(productId)) {
        continue;
      }
      walk(entry, (record) => {
        if (isPriceNode(record)) {
          found.push(record as PsStorePriceResponse);
        }
      });
    }
  }

  return found;
}

function isStandalone(price: PsStorePriceResponse): boolean {
  const branding = price.serviceBranding ?? [];
  return branding.length > 0 && branding.every((entry) => entry === STANDALONE_BRANDING);
}

function toEndsAt(endTime: string | number | null | undefined): Date | null {
  if (endTime === null || endTime === undefined || endTime === '') {
    return null;
  }
  const epochMs = typeof endTime === 'number' ? endTime : Number.parseInt(endTime, 10);
  if (!Number.isFinite(epochMs) || epochMs <= 0) {
    return null;
  }
  return new Date(epochMs);
}

function toPrice(price: PsStorePriceResponse): PsStorePrice {
  const discountText = price.displayDiscountText?.trim();
  return {
    basePrice: price.basePrice ?? '',
    discountedPrice: price.discountedPrice ?? '',
    basePriceValue: price.basePriceValue,
    discountedValue: price.discountedValue,
    currencyCode: price.currencyCode ?? '',
    discountText: discountText ? discountText : null,
    endsAt: toEndsAt(price.endTime),
    isFree: price.isFree === true,
  };
}

// Picks the standalone purchase price, ignoring the subscription "Included" entries that would
// otherwise read as a drop to zero.
export function selectStandalonePrice(prices: readonly PsStorePriceResponse[]): PsStorePrice | null {
  const standalone = prices.filter((price) => isStandalone(price) && price.isFree !== true);
  if (!standalone.length) {
    return null;
  }

  const cheapest = standalone.reduce((best, candidate) => (candidate.discountedValue < best.discountedValue ? candidate : best));
  return toPrice(cheapest);
}

function findEntry(caches: readonly PsStoreCache[], predicate: (entry: PsStoreCacheEntry, key: string) => boolean): { key: string; entry: PsStoreCacheEntry } | null {
  for (const cache of caches) {
    for (const [key, entry] of Object.entries(cache)) {
      if (entry && typeof entry === 'object' && predicate(entry, key)) {
        return { key, entry };
      }
    }
  }
  return null;
}

// The concept's default product is the base game, as opposed to its editions and add-ons.
export function extractDefaultProductId(caches: readonly PsStoreCache[]): string | null {
  const concept = findEntry(caches, (entry) => entry.__typename === 'Concept' && typeof (entry.defaultProduct as { __ref?: string })?.__ref === 'string');
  if (!concept) {
    return null;
  }

  const ref = (concept.entry.defaultProduct as { __ref: string }).__ref;
  return ref.startsWith(PRODUCT_REF_PREFIX) ? ref.slice(PRODUCT_REF_PREFIX.length) : null;
}

export function extractGameName(caches: readonly PsStoreCache[]): string | null {
  const concept = findEntry(caches, (entry) => entry.__typename === 'Concept' && typeof entry.name === 'string');
  if (concept) {
    return concept.entry.name;
  }

  const product = findEntry(caches, (entry) => entry.__typename === 'Product' && typeof entry.name === 'string');
  return product ? product.entry.name : null;
}

// Reads the name of one exact edition. A concept page names the franchise ("Call of Duty®"), which is
// wrong for a watch on a single edition, so the specific product's own name is preferred when known.
export function extractProductName(caches: readonly PsStoreCache[], productId: string): string | null {
  const product = findEntry(caches, (entry, key) => key === `${PRODUCT_REF_PREFIX}${productId}` && entry.__typename === 'Product' && typeof entry.name === 'string');
  return product ? (product.entry.name as string) : null;
}

// Product pages still reference their concept through the cache key, which lets a pasted
// product URL be normalised to the stable concept id.
export function extractConceptId(caches: readonly PsStoreCache[]): string | null {
  const byTypename = findEntry(caches, (entry) => entry.__typename === 'Concept' && typeof entry.id === 'string');
  if (byTypename) {
    return byTypename.entry.id;
  }

  const byKey = findEntry(caches, (_entry, key) => key.startsWith(CONCEPT_REF_PREFIX));
  if (!byKey) {
    return null;
  }

  const id = byKey.key.slice(CONCEPT_REF_PREFIX.length).split(':')[0];
  return id || null;
}

export function extractCoverUrl(caches: readonly PsStoreCache[]): string | null {
  const media: { role: string; url: string }[] = [];

  walk(caches, (record) => {
    if (record.type === 'IMAGE' && typeof record.url === 'string' && typeof record.role === 'string') {
      media.push({ role: record.role, url: record.url });
    }
  });

  const cover = media.find((item) => item.role === 'MASTER') ?? media.find((item) => item.role === 'GAMEHUB_COVER_ART') ?? media[0];
  return cover ? cover.url : null;
}
