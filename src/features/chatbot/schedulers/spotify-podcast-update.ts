import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { getShowEpisodes, getSpotifyAccessToken } from '@services/spotify';
import type { SpotifyEpisode } from '@services/spotify';
import { sendShortenedMessage } from '@services/telegram';
import { getSubscriptionsGroupedByChatId, updateSubscription } from '@shared/spotify-follower';
import type { Subscription } from '@shared/spotify-follower';
import { formatPodcastUpdateMessage } from './utils';
import type { PodcastEpisodeUpdate } from './utils';

const logger = new Logger('chatbot:scheduler:spotify-podcast-update');

const MARKET = 'IL';
const EPISODES_LIMIT = 20;

export async function spotifyPodcastUpdate(bot: Bot): Promise<void> {
  const subscriptionsByChatId = await getSubscriptionsGroupedByChatId();

  if (subscriptionsByChatId.size === 0) {
    return;
  }

  const accessToken = await getSpotifyAccessToken();

  for (const [chatId, subscriptions] of subscriptionsByChatId) {
    await processSubscriptionsForChat(bot, chatId, subscriptions, accessToken);
  }
}

async function processSubscriptionsForChat(bot: Bot, chatId: number, subscriptions: Subscription[], accessToken: string): Promise<void> {
  const updates: PodcastEpisodeUpdate[] = [];

  for (const subscription of subscriptions) {
    try {
      const { episodes } = await getShowEpisodes(subscription.showId, EPISODES_LIMIT, MARKET, accessToken);
      const newEpisodes = getNewEpisodes(episodes, subscription.lastEpisodeId);

      if (newEpisodes.length === 0) {
        continue;
      }

      updates.push({ showName: subscription.showName, episodes: newEpisodes });
      await updateSubscription(subscription.showId, chatId, {
        lastEpisodeId: newEpisodes[0].id,
        lastEpisodeReleaseDate: newEpisodes[0].release_date,
      });
    } catch (err) {
      logger.error(`Failed to fetch episodes for show ${subscription.showName}: ${getErrorMessage(err)}`);
    }
  }

  if (updates.length === 0) {
    return;
  }

  const message = formatPodcastUpdateMessage(updates);
  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}

function getNewEpisodes(episodes: SpotifyEpisode[], lastEpisodeId: string | null): SpotifyEpisode[] {
  if (!lastEpisodeId) {
    return episodes;
  }

  const newEpisodes: SpotifyEpisode[] = [];
  for (const episode of episodes) {
    if (episode.id === lastEpisodeId) {
      break;
    }
    newEpisodes.push(episode);
  }
  return newEpisodes;
}
