import { searchEventsByTag } from '@services/polymarket';

export async function handleSearch(keyword: string): Promise<string> {
  if (!keyword) {
    return JSON.stringify({ success: false, error: 'Keyword is required for search action' });
  }

  try {
    const { events } = await searchEventsByTag(keyword, 10);

    if (events.length === 0) {
      return JSON.stringify({
        success: true,
        message: `No events found for keyword "${keyword}". Try a different keyword like "bitcoin", "trump", "fed", "sports", etc.`,
        events: [],
      });
    }

    const eventsList = events.map((event, index) => ({
      rank: index + 1,
      title: event.title,
      slug: event.slug,
      volume24hr: event.volume24hr,
      url: event.polymarketUrl,
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${events.length} events for "${keyword}" (sorted by 24h volume)`,
      events: eventsList,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to search: ${err.message}` });
  }
}
