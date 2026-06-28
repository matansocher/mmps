import type { gmail_v1 } from 'googleapis';

export type EmailPart = gmail_v1.Schema$MessagePart;

export function flattenParts(part: EmailPart | undefined, acc: EmailPart[] = []): EmailPart[] {
  if (!part) return acc;
  acc.push(part);
  for (const child of part.parts || []) {
    flattenParts(child, acc);
  }
  return acc;
}

export function decodeBase64Url(data: string): Buffer {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

export function extractBody(parts: ReadonlyArray<EmailPart>): { plain: string; html: string } {
  let plain = '';
  let html = '';
  for (const part of parts) {
    const data = part.body?.data;
    if (!data) continue;
    const text = decodeBase64Url(data).toString('utf-8');
    if (part.mimeType === 'text/plain') plain += text;
    else if (part.mimeType === 'text/html') html += text;
  }
  return { plain, html };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
