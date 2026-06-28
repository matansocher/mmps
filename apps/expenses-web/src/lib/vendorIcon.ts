// Resolves a vendor name to a brand-logo URL via Google's favicon service.
//
// Keys are normalized name fragments (lowercase latin or Hebrew, punctuation/
// spaces stripped) matched as substrings of the normalized vendor name, so
// partial/embedded brand names still resolve. Every domain below was verified
// to return a real (non-generic) favicon. Vendors with no known brand domain
// intentionally have no entry and fall back to an initials avatar.
const VENDOR_DOMAINS: Record<string, string> = {
  // Online / global
  wolt: 'wolt.com',
  openai: 'openai.com',
  chatgpt: 'openai.com',
  claude: 'claude.ai',
  spotify: 'spotify.com',
  gett: 'gett.com',
  heroku: 'heroku.com',
  emirates: 'emirates.com',
  agoda: 'agoda.com',
  playstation: 'playstation.com',
  adidas: 'adidas.co.il',
  netflix: 'netflix.com',
  youtube: 'youtube.com',
  google: 'google.com',
  apple: 'apple.com',
  amazon: 'amazon.com',
  microsoft: 'microsoft.com',
  github: 'github.com',
  booking: 'booking.com',
  airbnb: 'airbnb.com',
  uber: 'uber.com',
  aliexpress: 'aliexpress.com',
  ebay: 'ebay.com',
  ikea: 'ikea.com',
  disney: 'disneyplus.com',
  // Israel — retail / groceries / fuel / pharma
  shufersal: 'shufersal.co.il',
  שופרסל: 'shufersal.co.il',
  paz: 'paz.co.il',
  פז: 'paz.co.il',
  סונול: 'sonol.co.il',
  sonol: 'sonol.co.il',
  דלק: 'delek.co.il',
  delek: 'delek.co.il',
  סופרפארם: 'super-pharm.co.il',
  superpharm: 'super-pharm.co.il',
  הוםסנטר: 'homecenter.co.il',
  homecenter: 'homecenter.co.il',
  סטימצקי: 'steimatzky.co.il',
  steimatzky: 'steimatzky.co.il',
  ארומה: 'aroma.co.il',
  מקדונלדס: 'mcdonalds.co.il',
  mcdonalds: 'mcdonalds.co.il',
  pmam: 'ampm.co.il',
  ספאר: 'spar.co.il',
  מקס: 'maxstock.co.il',
  // Israel — telecom / transport / services
  פרטנר: 'partner.co.il',
  partner: 'partner.co.il',
  סלקום: 'cellcom.co.il',
  cellcom: 'cellcom.co.il',
  פנגו: 'pango.co.il',
  pango: 'pango.co.il',
  רכבתישראל: 'rail.co.il',
  נאייקס: 'nayax.com',
  nayax: 'nayax.com',
  elal: 'elal.com',
  // Israel — insurance / finance
  איילון: 'ayalon-ins.co.il',
  מנורהמבטחים: 'menoramivt.co.il',
  הפניקס: 'fnx.co.il',
  paybox: 'payboxapp.com',
  paypal: 'paypal.com',
};

// Some brands have no usable Google favicon but serve a real logo asset
// directly. Map those vendor fragments to a full, verified image URL.
const VENDOR_LOGO_OVERRIDES: Record<string, string> = {
  יוחננוף: 'https://yochananof.co.il/pwa/ios/152.png',
};

// Payment gateways are matched only when no more specific brand matches, so
// e.g. "PAYPAL *ADIDAS" resolves to Adidas, not PayPal.
const LOW_PRIORITY_KEYS = new Set(['paypal']);

const MATCH_KEYS = Object.keys(VENDOR_DOMAINS);
const OVERRIDE_KEYS = Object.keys(VENDOR_LOGO_OVERRIDES);

function normalizeVendor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]/g, '');
}

function bestMatchKey(normalized: string, keys: ReadonlyArray<string>): string | null {
  const matches = keys.filter((key) => normalized.includes(key));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const aLow = LOW_PRIORITY_KEYS.has(a) ? 1 : 0;
    const bLow = LOW_PRIORITY_KEYS.has(b) ? 1 : 0;
    if (aLow !== bLow) return aLow - bLow;
    return b.length - a.length;
  });
  return matches[0];
}

export function getVendorDomain(vendor: string): string | null {
  const normalized = normalizeVendor(vendor);
  if (!normalized) return null;
  const key = bestMatchKey(normalized, MATCH_KEYS);
  return key ? VENDOR_DOMAINS[key] : null;
}

export function getVendorLogoUrl(vendor: string): string | null {
  const normalized = normalizeVendor(vendor);
  if (!normalized) return null;
  const overrideKey = bestMatchKey(normalized, OVERRIDE_KEYS);
  if (overrideKey) return VENDOR_LOGO_OVERRIDES[overrideKey];
  const domain = getVendorDomain(vendor);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

const AVATAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export function getVendorInitials(vendor: string): string {
  const words = vendor
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function getVendorColor(vendor: string): string {
  let hash = 0;
  for (let i = 0; i < vendor.length; i++) hash = (hash * 31 + vendor.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
