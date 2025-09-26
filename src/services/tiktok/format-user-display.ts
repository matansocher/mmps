import type { TikTokUserSearchResult } from '@features/tiktok/utils/search-tiktok-users';

export function formatUserDisplay(user: TikTokUserSearchResult): string {
  let display = `@${user.username}`;

  if (user.displayName && user.displayName !== user.username) {
    display += ` (${user.displayName})`;
  }

  if (user.isVerified) {
    display += ' ✓';
  }

  if (user.followerCount) {
    display += ` - ${user.followerCount}`;
  }

  if (display.length > 60) {
    display = display.substring(0, 57) + '...';
  }

  return display;
}
