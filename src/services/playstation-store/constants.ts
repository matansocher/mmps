export const PS_STORE_BASE_URL = 'https://store.playstation.com';

// The Israeli storefront — prices come back in ILS, matching the project default region.
export const DEFAULT_LOCALE = 'en-il';
export const DEFAULT_CURRENCY = 'ILS';

// PS Store returns one price entry per edition and per subscription that includes the game.
// Only 'NONE' branded entries are real standalone purchase prices — PS_PLUS/UBISOFT_PLUS entries
// show up as "Included" at value 0 and would otherwise look like a drop to free.
export const STANDALONE_BRANDING = 'NONE';

// Requests without a browser user agent are served an error shell with no embedded price data.
export const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const REQUEST_TIMEOUT_MS = 30 * 1000;
