import type { ParsedPsStoreUrl } from '../types';

const CONCEPT_PATH = /\/concept\/(\d+)/i;
const PRODUCT_PATH = /\/product\/([A-Za-z0-9_-]+)/i;

// Extracts the concept or product id from a PlayStation Store page URL.
// Concept ids are stable and region independent, product ids are region prefixed SKUs.
export function parsePsStoreUrl(rawUrl: string): ParsedPsStoreUrl | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (!/(^|\.)playstation\.com$/i.test(url.hostname)) {
    return null;
  }

  const concept = url.pathname.match(CONCEPT_PATH);
  if (concept) {
    return { kind: 'concept', id: concept[1] };
  }

  const product = url.pathname.match(PRODUCT_PATH);
  if (product) {
    return { kind: 'product', id: product[1] };
  }

  return null;
}
