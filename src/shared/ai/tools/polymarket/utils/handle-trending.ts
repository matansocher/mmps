import { getTrendingMarkets } from '@services/polymarket';

export async function handleTrending(): Promise<string> {
  try {
    const { markets } = await getTrendingMarkets(10);

    if (markets.length === 0) {
      return JSON.stringify({ success: true, message: 'No trending markets found', markets: [] });
    }

    const marketsList = markets.map((market, index) => ({
      rank: index + 1,
      question: market.question,
      yesPrice: `${(market.yesPrice * 100).toFixed(1)}%`,
      volume24hr: market.volume24hr,
      slug: market.slug,
      url: market.polymarketUrl,
    }));

    return JSON.stringify({
      success: true,
      message: `Top ${markets.length} trending markets by 24h volume`,
      markets: marketsList,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to fetch trending markets: ${err.message}` });
  }
}
