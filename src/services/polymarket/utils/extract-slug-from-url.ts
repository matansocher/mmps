export function extractSlugFromUrl(input: string): string {
  const trimmed = input.trim()

  // Handle full Polymarket URLs: polymarket.com/event/{slug}
  if (trimmed.includes('polymarket.com/event/')) {
    try {
      const url = new URL(trimmed)
      const pathname = url.pathname
      const parts = pathname.split('/event/')[1]
      if (parts) {
        return parts.split('/')[0].split('?')[0]
      }
    } catch {
      // If URL parsing fails, try regex fallback
      const match = trimmed.match(/polymarket\.com\/event\/([^/?]+)/)
      if (match) {
        return match[1]
      }
    }
  }

  // Handle market URLs: polymarket.com/market/{slug}
  if (trimmed.includes('polymarket.com/market/')) {
    try {
      const url = new URL(trimmed)
      const pathname = url.pathname
      const parts = pathname.split('/market/')[1]
      if (parts) {
        return parts.split('/')[0].split('?')[0]
      }
    } catch {
      // If URL parsing fails, try regex fallback
      const match = trimmed.match(/polymarket\.com\/market\/([^/?]+)/)
      if (match) {
        return match[1]
      }
    }
  }

  // Already a slug (no URL)
  return trimmed
}
