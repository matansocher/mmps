import { getEventBySlug, getEventOutcomes } from '@services/polymarket';

export async function handleEvent(slug: string): Promise<string> {
  if (!slug) {
    return JSON.stringify({ success: false, error: 'Slug is required for event action' });
  }

  try {
    // Multi-outcome events (e.g. "World Cup Winner") return one probability per outcome
    const multiOutcomeResult = await tryHandleMultiOutcomeEvent(slug);
    if (multiOutcomeResult) {
      return multiOutcomeResult;
    }

    const { event, markets } = await getEventBySlug(slug);

    if (markets.length === 0) {
      return JSON.stringify({
        success: true,
        message: `Event "${event.title}" found but has no active markets`,
        event: {
          title: event.title,
          slug: event.slug,
          url: event.polymarketUrl,
        },
        markets: [],
      });
    }

    const marketsList = markets.map((market, index) => ({
      rank: index + 1,
      question: market.question,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      volume24hr: market.volume24hr,
      oneDayPriceChange: market.oneDayPriceChange,
      endDate: market.endDate,
      url: market.polymarketUrl,
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${markets.length} markets under event "${event.title}"`,
      event: {
        title: event.title,
        slug: event.slug,
        url: event.polymarketUrl,
      },
      markets: marketsList,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to fetch event: ${err.message}` });
  }
}

async function tryHandleMultiOutcomeEvent(slug: string): Promise<string | null> {
  try {
    const event = await getEventOutcomes(slug);

    if (!event.negRisk && event.outcomes.length <= 1) {
      return null;
    }

    const outcomes = event.outcomes.map((outcome, index) => ({
      rank: index + 1,
      outcome: outcome.outcome,
      probability: outcome.probability,
      probabilityPercent: `${(outcome.probability * 100).toFixed(1)}%`,
      oneDayPriceChange: outcome.oneDayPriceChange,
    }));

    return JSON.stringify({
      success: true,
      type: 'multi',
      message: `Event "${event.title}" has ${outcomes.length} possible outcomes (probabilities shown per outcome)`,
      event: {
        title: event.title,
        slug: event.slug,
        url: event.polymarketUrl,
      },
      outcomes,
    });
  } catch {
    return null;
  }
}
