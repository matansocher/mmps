// Scrapes Telegram's public web preview (https://t.me/s/<handle>), which serves the
// last ~20 posts of any public channel as plain HTML. No API key, no session, no MTProto.
// Post ids are sequential per channel, so they fit a lastSeenId diffing pattern.
// Public channels only; some channels disable the preview (t.me/s/<handle> then
// redirects to t.me/<handle>) — detected and reported as an error.
import type { TelegramChannelInfo, TelegramChannelPost, TelegramChannelResult } from './types';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export async function fetchChannelPosts(handle: string, count = 5): Promise<TelegramChannelResult> {
  const cleanHandle = handle.replace(/^@/, '');
  const html = await fetchPreviewPage(cleanHandle);
  const channel = parseChannelInfo(html, cleanHandle);
  const posts = parsePosts(html, cleanHandle)
    .sort((a, b) => b.id - a.id)
    .slice(0, count);
  return { channel, posts };
}

async function fetchPreviewPage(handle: string): Promise<string> {
  const res = await fetch(`https://t.me/s/${encodeURIComponent(handle)}`, {
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'en' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Telegram preview returned HTTP ${res.status} for @${handle}`);
  }
  // If preview is disabled, Telegram redirects t.me/s/<handle> -> t.me/<handle>
  if (!new URL(res.url).pathname.startsWith('/s/')) {
    throw new Error(`@${handle} is not a public channel with web preview enabled`);
  }
  return res.text();
}

function decodeEntities(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractBetween(html: string, startMarker: string, endMarker: string): string | null {
  const start = html.indexOf(startMarker);
  if (start === -1) return null;
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return null;
  return html.slice(start + startMarker.length, end);
}

function parseChannelInfo(html: string, handle: string): TelegramChannelInfo {
  const title = extractBetween(html, '<div class="tgme_channel_info_header_title"', '</div>');
  const subscribers = extractBetween(html, '<span class="counter_value">', '</span>');
  return {
    handle,
    title: title ? decodeEntities(title.slice(title.indexOf('>') + 1)) : null,
    subscribers: subscribers ? decodeEntities(subscribers) : null,
  };
}

function parsePosts(html: string, handle: string): TelegramChannelPost[] {
  const posts: TelegramChannelPost[] = [];
  const postRegex = /data-post="[^"]+\/(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = postRegex.exec(html)) !== null) {
    const id = Number(match[1]);
    const blockEnd = html.indexOf('data-post="', match.index + 1);
    const block = html.slice(match.index, blockEnd === -1 ? undefined : blockEnd);

    const textHtml = extractBetween(block, '<div class="tgme_widget_message_text js-message_text" dir="auto">', '</div>');
    const views = extractBetween(block, '<span class="tgme_widget_message_views">', '</span>');

    posts.push({
      id,
      url: `https://t.me/${handle}/${id}`,
      text: textHtml ? decodeEntities(textHtml) : null,
      publishedAt: block.match(/<time datetime="([^"]+)"/)?.[1] ?? null,
      views: views ? decodeEntities(views) : null,
      hasPhoto: block.includes('tgme_widget_message_photo_wrap'),
      hasVideo: block.includes('tgme_widget_message_video_player'),
    });
  }
  // The page can repeat data-post attributes (e.g. reply previews) — dedupe by id
  const seen = new Set<number>();
  return posts.filter((post) => (seen.has(post.id) ? false : seen.add(post.id)));
}
