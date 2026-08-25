import { Logger } from '@core/utils';
import { BROWSER_USER_AGENT, DEFAULT_LOCALE, PS_STORE_BASE_URL, REQUEST_TIMEOUT_MS } from './constants';
import type { PsStoreGame } from './types';
import { collectPriceObjects, extractConceptId, extractCoverUrl, extractDefaultProductId, extractEmbeddedCaches, extractGameName, selectStandalonePrice } from './utils';

const logger = new Logger('playstation-store:api');

export function buildConceptUrl(conceptId: string, locale: string = DEFAULT_LOCALE): string {
  return `${PS_STORE_BASE_URL}/${locale}/concept/${conceptId}`;
}

export function buildProductUrl(productId: string, locale: string = DEFAULT_LOCALE): string {
  return `${PS_STORE_BASE_URL}/${locale}/product/${productId}`;
}

async function fetchStorePage(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { 'user-agent': BROWSER_USER_AGENT, accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`PlayStation Store request failed: HTTP ${response.status} for ${url}`);
  }

  const html = await response.text();
  return html || null;
}

// Reads the standalone purchase price of a game from its PlayStation Store concept page.
// Returns null when the page has no buyable standalone price, for example when the title is
// only available through a subscription or the storefront layout changed.
export async function getGamePrice(conceptId: string, locale: string = DEFAULT_LOCALE): Promise<PsStoreGame | null> {
  const url = buildConceptUrl(conceptId, locale);
  const html = await fetchStorePage(url);
  if (!html) {
    logger.warn(`Empty store page for concept ${conceptId}`);
    return null;
  }

  const caches = extractEmbeddedCaches(html);
  if (!caches.length) {
    logger.warn(`No embedded store data found for concept ${conceptId}`);
    return null;
  }

  const defaultProductId = extractDefaultProductId(caches);
  const price = selectStandalonePrice(collectPriceObjects(caches, defaultProductId));
  if (!price) {
    logger.warn(`No standalone price found for concept ${conceptId}`);
    return null;
  }

  return {
    conceptId,
    name: extractGameName(caches) ?? `Concept ${conceptId}`,
    url,
    coverUrl: extractCoverUrl(caches),
    price,
  };
}

// Product urls are region prefixed and redirect when the locale does not match, so a pasted
// product link is resolved to its stable concept id once, at add time.
export async function resolveConceptIdFromProduct(productId: string, locale: string = DEFAULT_LOCALE): Promise<string | null> {
  const html = await fetchStorePage(buildProductUrl(productId, locale));
  if (!html) {
    return null;
  }
  return extractConceptId(extractEmbeddedCaches(html));
}
