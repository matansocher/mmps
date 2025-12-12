import type { YouTubeRSSVideo } from '../types';

export function parseRSSFeed(xmlText: string): YouTubeRSSVideo[] {
  const videos: YouTubeRSSVideo[] = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const videoIdRegex = /<yt:videoId>(.*?)<\/yt:videoId>/;
  const titleRegex = /<title>(.*?)<\/title>/;
  const publishedRegex = /<published>(.*?)<\/published>/;
  const authorRegex = /<name>(.*?)<\/name>/;

  let match;
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1];

    const videoIdMatch = entry.match(videoIdRegex);
    const titleMatch = entry.match(titleRegex);
    const publishedMatch = entry.match(publishedRegex);
    const authorMatch = entry.match(authorRegex);

    if (videoIdMatch) {
      videos.push({
        id: videoIdMatch[1],
        url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
        title: titleMatch ? decodeXMLEntities(titleMatch[1]) : '',
        publishedAt: publishedMatch ? publishedMatch[1] : '',
        author: authorMatch ? decodeXMLEntities(authorMatch[1]) : '',
      });
    }
  }

  return videos;
}

export function buildRSSFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}
