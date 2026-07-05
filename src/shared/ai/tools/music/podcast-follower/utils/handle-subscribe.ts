import { getShow, getShowEpisodes, getSpotifyAccessToken } from '@services/spotify';
import { createSubscription, getSubscription } from '@shared/spotify-follower';

const MARKET = 'IL';

export async function handleSubscribe(chatId: number, showId: string): Promise<string> {
  if (!showId) {
    return JSON.stringify({ success: false, error: 'showId is required for subscribe action. Use the search action first to find a show id.' });
  }

  try {
    const existing = await getSubscription(showId, chatId);
    if (existing) {
      return JSON.stringify({ success: false, error: 'Already subscribed to this podcast', show: { id: existing.showId, name: existing.showName } });
    }

    const accessToken = await getSpotifyAccessToken();
    const show = await getShow(showId, MARKET, accessToken);

    // Seed the latest episode so only episodes published after subscribing trigger notifications
    const { episodes } = await getShowEpisodes(showId, 1, MARKET, accessToken);
    const latestEpisode = episodes[0] ?? null;

    await createSubscription({
      showId,
      showName: show.name,
      chatId,
      lastEpisodeId: latestEpisode?.id ?? null,
      lastEpisodeReleaseDate: latestEpisode?.release_date ?? null,
    });

    return JSON.stringify({
      success: true,
      message: `Successfully subscribed to podcast "${show.name}". You'll be notified when a new episode is published.`,
      show: { id: showId, name: show.name, publisher: show.publisher, latestEpisode: latestEpisode?.name ?? null },
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to subscribe: ${err.message}` });
  }
}
