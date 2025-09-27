import * as cheerio from 'cheerio';

export interface ExtractedContent {
  title: string;
  mainContent: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  imageUrl?: string;
}

export function extractContent(html: string, maxLength: number = 5000): ExtractedContent {
  const $ = cheerio.load(html);

  // Remove script and style elements
  $('script, style, noscript, iframe, svg').remove();

  // Remove common navigation and footer elements
  $('nav, header, footer, aside, .nav, .header, .footer, .sidebar, .advertisement, .ads, .cookie-banner').remove();

  // Extract metadata
  const title = extractTitle($);
  const description = extractDescription($);
  const author = extractAuthor($);
  const publishedDate = extractPublishedDate($);
  const imageUrl = extractMainImage($);

  // Extract main content
  const mainContent = extractMainContent($, maxLength);

  return {
    title,
    mainContent,
    description,
    author,
    publishedDate,
    imageUrl,
  };
}

function extractTitle($: cheerio.CheerioAPI): string {
  // Try multiple selectors for title
  const selectors = ['h1', 'meta[property="og:title"]', 'meta[name="twitter:title"]', 'title', '.title', '.headline'];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content) return content.trim();
    } else {
      const text = $(selector).first().text();
      if (text) return text.trim();
    }
  }

  return 'Untitled Page';
}

function extractDescription($: cheerio.CheerioAPI): string | undefined {
  const selectors = ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'];

  for (const selector of selectors) {
    const content = $(selector).attr('content');
    if (content) return content.trim();
  }

  return undefined;
}

function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  const selectors = ['meta[name="author"]', 'meta[property="article:author"]', '.author', '.by-author', '.byline', '[rel="author"]'];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content) return content.trim();
    } else {
      const text = $(selector).first().text();
      if (text) return text.trim();
    }
  }

  return undefined;
}

function extractPublishedDate($: cheerio.CheerioAPI): string | undefined {
  const selectors = ['meta[property="article:published_time"]', 'meta[name="publish_date"]', 'time[datetime]', '.published-date', '.date'];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content) return content.trim();
    } else if (selector === 'time[datetime]') {
      const datetime = $('time[datetime]').first().attr('datetime');
      if (datetime) return datetime.trim();
    } else {
      const text = $(selector).first().text();
      if (text) return text.trim();
    }
  }

  return undefined;
}

function extractMainImage($: cheerio.CheerioAPI): string | undefined {
  const selectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'article img', 'main img', '.content img'];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content) return content.trim();
    } else {
      const src = $(selector).first().attr('src');
      if (src) return src.trim();
    }
  }

  return undefined;
}

function extractMainContent($: cheerio.CheerioAPI, maxLength: number): string {
  // Try to find the main content area
  const contentSelectors = ['article', 'main', '[role="main"]', '.content', '.post-content', '.entry-content', '.article-body', '#content', 'body'];

  let contentElement: cheerio.Cheerio<any> | null = null;

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      contentElement = element.first();
      break;
    }
  }

  if (!contentElement) {
    contentElement = $('body');
  }

  // Extract text from paragraphs, headings, and lists
  const textElements: string[] = [];

  contentElement.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th').each((_, element) => {
    const text = $(element).text().trim();
    if (text && text.length > 20) {
      // Filter out very short text
      textElements.push(text);
    }
  });

  // Join and clean the text
  let content = textElements.join('\n\n');

  // Clean up excessive whitespace
  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.replace(/\s+/g, ' ');
  content = content.trim();

  // Truncate if necessary
  if (content.length > maxLength) {
    content = content.substring(0, maxLength);
    const lastPeriod = content.lastIndexOf('.');
    if (lastPeriod > maxLength * 0.8) {
      content = content.substring(0, lastPeriod + 1);
    } else {
      content += '...';
    }
  }

  return content || 'No readable content found on this page.';
}
