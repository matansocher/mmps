export function extractChannelIdentifier(input: string): string {
  const trimmed = input.trim();

  if (trimmed.includes('youtube.com/')) {
    try {
      const url = new URL(trimmed);
      const pathname = url.pathname;

      if (pathname.includes('/channel/')) {
        return pathname.split('/channel/')[1].split('/')[0];
      }

      if (pathname.includes('/@')) {
        return `@${pathname.split('/@')[1].split('/')[0]}`;
      }

      if (pathname.includes('/c/') || pathname.includes('/user/')) {
        const parts = pathname.split('/').filter((p) => p);
        return parts[1];
      }
    } catch {
      // If URL parsing fails, treat as plain text
    }
  }

  if (trimmed.startsWith('@')) {
    return trimmed;
  }

  if (trimmed.startsWith('UC') && trimmed.length === 24) {
    return trimmed;
  }

  return `@${trimmed}`;
}
