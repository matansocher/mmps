import { VIDEO_ID_REFERENCES } from '../constants';
import type { TikTokApiItem, TikTokVideo } from '../types';

/**
 * Extract video information from TikTok API item
 */
export function extractVideoInfo(item: TikTokApiItem, username: string): TikTokVideo {
  const videoId = item.id;
  const video: TikTokVideo = {
    id: videoId,
    url: `https://www.tiktok.com/@${username}/video/${videoId}`,
    description: '',
    uploadDate: '',
  };

  // Extract description
  if (item.desc || item.description) {
    video.description = (item.desc || item.description || '').substring(0, 100);
  }

  // Extract upload date
  if (item.createTime) {
    video.uploadDate = formatDateFromTimestamp(item.createTime);
  } else if (item.createDate) {
    video.uploadDate = item.createDate;
  } else {
    // Fallback: estimate from video ID
    video.uploadDate = estimateDateFromVideoId(videoId);
  }

  return video;
}

/**
 * Format date from Unix timestamp
 */
function formatDateFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Estimate upload date from video ID
 * TikTok video IDs are sequential numbers that increase over time
 * This provides an approximate date based on known reference points
 */
export function estimateDateFromVideoId(videoId: string): string {
  try {
    const videoIdNum = BigInt(videoId);

    let estimatedDate: Date | null = null;

    // Find the closest reference point and interpolate
    for (let i = 0; i < VIDEO_ID_REFERENCES.length - 1; i++) {
      const current = VIDEO_ID_REFERENCES[i];
      const next = VIDEO_ID_REFERENCES[i + 1];

      if (videoIdNum >= current.id) {
        // Interpolate between reference points
        const idDiff = Number(videoIdNum - current.id);
        const idRange = Number(current.id - next.id);
        const timeDiff = current.date.getTime() - next.date.getTime();
        const ratio = idDiff / idRange;
        const estimatedTime = current.date.getTime() - ratio * timeDiff;
        estimatedDate = new Date(estimatedTime);
        break;
      }
    }

    // If video ID is older than all references
    if (!estimatedDate && videoIdNum < VIDEO_ID_REFERENCES[VIDEO_ID_REFERENCES.length - 1].id) {
      estimatedDate = VIDEO_ID_REFERENCES[VIDEO_ID_REFERENCES.length - 1].date;
    }

    if (estimatedDate) {
      const year = estimatedDate.getFullYear();
      const month = String(estimatedDate.getMonth() + 1).padStart(2, '0');
      const day = String(estimatedDate.getDate()).padStart(2, '0');
      return `~${year}-${month}-${day}`; // ~ indicates it's an estimate
    }
  } catch (error) {
    // If parsing fails, return empty string
    console.error('Failed to estimate date from video ID:', error);
  }

  return '';
}

/**
 * Sort videos by upload date (newest first)
 * Handles dates with ~ prefix (estimates) by treating them as regular dates
 */
export function sortVideosByDate(videos: TikTokVideo[]): TikTokVideo[] {
  return [...videos].sort((a, b) => {
    const dateA = parseDateString(a.uploadDate);
    const dateB = parseDateString(b.uploadDate);

    // Put videos without dates at the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    // Sort newest first
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Parse date string, handling estimates (with ~ prefix)
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove ~ prefix if present (indicates estimate)
  const cleanDate = dateStr.replace(/^~/, '');

  try {
    const date = new Date(cleanDate);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Get the latest N videos sorted by upload date
 */
export function getLatestVideos(videos: TikTokVideo[], count: number): TikTokVideo[] {
  const sorted = sortVideosByDate(videos);
  return sorted.slice(0, count);
}
