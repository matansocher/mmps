import { tool } from '@langchain/core/tools';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { isIP } from 'node:net';
import { z } from 'zod';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_CHARS = 15_000;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const schema = z.object({
  url: z.string().url().describe('The full http(s) URL of the web page to open and read.'),
});

type ParsedElement = {
  readonly textContent: string | null;
  remove(): void;
};

type ParsedDocument = {
  readonly body: ParsedElement | null;
  querySelector(selector: string): ParsedElement | null;
  querySelectorAll(selector: string): ParsedElement[];
};

type ReadabilityInput = ConstructorParameters<typeof Readability>[0];

function parseDocument(html: string): ParsedDocument {
  return (parseHTML(html) as unknown as { readonly document: ParsedDocument }).document;
}

export type ReadablePage = {
  readonly title: string | null;
  readonly byline: string | null;
  readonly content: string;
};

function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const [a, b] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (ipVersion === 6) {
    return host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80') || host.startsWith('::ffff:');
  }
  return false;
}

export function assertPublicUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error('Refusing to open a local or private network address');
  }
  return url;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractReadableText(html: string): ReadablePage {
  const document = parseDocument(html);
  const fallbackTitle = document.querySelector('title')?.textContent?.trim() || null;
  const article = new Readability(document as unknown as ReadabilityInput).parse();
  if (article?.textContent?.trim()) {
    return { title: article.title?.trim() || fallbackTitle, byline: article.byline?.trim() || null, content: normalizeWhitespace(article.textContent) };
  }

  // Readability gives up on non-article pages (listings, dashboards) - fall back to the raw body text
  const rawDocument = parseDocument(html);
  rawDocument.querySelectorAll('script, style, noscript, svg, template').forEach((el) => el.remove());
  return { title: fallbackTitle, byline: null, content: normalizeWhitespace(rawDocument.body?.textContent ?? '') };
}

async function runner({ url }: z.infer<typeof schema>) {
  const target = assertPublicUrl(url);
  const response = await fetch(target, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const finalUrl = response.url || target.href;
  assertPublicUrl(finalUrl);

  if (!response.ok) {
    return { url, finalUrl, error: `Request failed with HTTP ${response.status}` };
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();
  let page: ReadablePage;
  if (contentType.includes('html') || (!contentType && /<html[\s>]/i.test(body))) {
    page = extractReadableText(body);
  } else if (contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml')) {
    page = { title: null, byline: null, content: body.trim() };
  } else {
    return { url, finalUrl, error: `Unsupported content type: ${contentType}` };
  }

  const truncated = page.content.length > MAX_CONTENT_CHARS;
  return {
    url,
    finalUrl,
    title: page.title,
    byline: page.byline,
    content: truncated ? page.content.slice(0, MAX_CONTENT_CHARS) : page.content,
    truncated,
  };
}

export const browseUrlTool = tool(runner, {
  name: 'browse_url',
  description:
    'Open a specific web page by URL and read its main text content (article body, docs page, product page, blog post, etc.). Use this when the user shares a link or asks about the contents of a specific page (e.g. "summarize this", "what does this page say about X"), or to read a source returned by web_search in more detail. It does not run JavaScript or click/interact, so heavily client-rendered pages may return little content - say so if that happens. Content is truncated to ~15k characters (`truncated: true`). Answer based on the returned content and link the page.',
  schema,
});
