import { Logger } from '@core/utils';
import { BROWSER_USER_AGENT, DEFAULT_LOCALE, PS_STORE_BASE_URL, REQUEST_TIMEOUT_MS } from './constants';
import type { PsStoreGame } from './types';
import { collectPriceObjects, extractConceptId, extractCoverUrl, extractDefaultProductId, extractEmbeddedCaches, extractGameName, extractProductName, selectStandalonePrice } from './utils';

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
// When a productId is given the price is read for that exact edition, which is what a pre-order or a
// specific edition needs. Otherwise the concept's default product is used. Returns null when there is
// no buyable standalone price, for example a subscription-only title or a changed storefront layout.
export async function getGamePrice(conceptId: string, options: { readonly productId?: string; readonly locale?: string } = {}): Promise<PsStoreGame | null> {
  const { productId, locale = DEFAULT_LOCALE } = options;
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

  const targetProductId = productId ?? extractDefaultProductId(caches);
  const price = selectStandalonePrice(collectPriceObjects(caches, targetProductId));
  if (!price) {
    logger.warn(`No standalone price found for concept ${conceptId}${productId ? ` product ${productId}` : ''}`);
    return null;
  }

  const name = (targetProductId ? extractProductName(caches, targetProductId) : null) ?? extractGameName(caches) ?? `Concept ${conceptId}`;
  return {
    conceptId,
    productId: targetProductId ?? undefined,
    name,
    url,
    coverUrl: extractCoverUrl(caches),
    price,
  };
}

// Reads a game straight off a pasted product page. Product urls point at one exact edition, so this
// keeps that edition's price — pre-orders and non-default editions included — instead of falling back
// to the concept's default product, which on franchise umbrella concepts can be a beta or the wrong game.
export async function getGamePriceFromProduct(productId: string, locale: string = DEFAULT_LOCALE): Promise<PsStoreGame | null> {
  const url = buildProductUrl(productId, locale);
  const html = await fetchStorePage(url);
  if (!html) {
    logger.warn(`Empty store page for product ${productId}`);
    return null;
  }

  const caches = extractEmbeddedCaches(html);
  if (!caches.length) {
    logger.warn(`No embedded store data found for product ${productId}`);
    return null;
  }

  const conceptId = extractConceptId(caches);
  const price = selectStandalonePrice(collectPriceObjects(caches, productId));
  if (!conceptId || !price) {
    logger.warn(`No standalone price found for product ${productId}`);
    return null;
  }

  const name = extractProductName(caches, productId) ?? extractGameName(caches) ?? `Product ${productId}`;
  return {
    conceptId,
    productId,
    name,
    url: buildConceptUrl(conceptId, locale),
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
