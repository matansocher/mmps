import { Injectable, Logger } from '@nestjs/common';
import { formatNumber } from '@core/utils';
import { getUserByUsername, TwitterTweet, TwitterUser } from '@services/twitter';
import { addSubscription, getSubscriptionByUsername, removeSubscription } from '@shared/twitter';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);

  async subscribeToUser(chatId: number, username: string): Promise<{ success: boolean; message: string; user?: TwitterUser }> {
    try {
      const cleanUsername = username.replace('@', '');

      const existingSubscription = await getSubscriptionByUsername(chatId, cleanUsername);
      if (existingSubscription) {
        return {
          success: false,
          message: `You are already subscribed to @${cleanUsername}`,
        };
      }

      // Fetch user from Twitter API
      const user = await getUserByUsername(cleanUsername);
      if (!user) {
        return {
          success: false,
          message: `Twitter user @${cleanUsername} not found`,
        };
      }

      // Save to database
      await addSubscription({
        chatId,
        twitterUserId: user.id,
        username: user.username,
        name: user.name,
        description: user.description,
        profileImageUrl: user.profile_image_url,
        verified: user.verified,
        followersCount: user.public_metrics.followers_count,
        followingCount: user.public_metrics.following_count,
        tweetCount: user.public_metrics.tweet_count,
        subscribedAt: new Date(),
      });

      this.logger.log(`Successfully subscribed to @${user.username} for chatId: ${chatId}`);

      return {
        success: true,
        message: this.formatUserDetails(user),
        user,
      };
    } catch (error) {
      this.logger.error(`Failed to subscribe to user: ${error.message}`);
      return {
        success: false,
        message: `Failed to subscribe: ${error.message}`,
      };
    }
  }

  async unsubscribeFromUser(chatId: number, username: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanUsername = username.replace('@', '');
      const removed = await removeSubscription(chatId, cleanUsername);

      if (!removed) {
        return {
          success: false,
          message: `You are not subscribed to @${cleanUsername}`,
        };
      }

      this.logger.log(`Successfully unsubscribed from @${cleanUsername} for chatId: ${chatId}`);

      return {
        success: true,
        message: `Successfully unsubscribed from @${cleanUsername}`,
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from user: ${error.message}`);
      return {
        success: false,
        message: `Failed to unsubscribe: ${error.message}`,
      };
    }
  }

  formatUserDetails(user: TwitterUser): string {
    const verifiedBadge = user.verified ? '✓ ' : '';
    return `✅ Successfully subscribed to:\n\n${verifiedBadge}${user.name} (@${user.username})\n\n📝 ${user.description || 'No bio available'}\n\n👥 Followers: ${formatNumber(user.public_metrics.followers_count)}\n👤 Following: ${formatNumber(user.public_metrics.following_count)}\n📱 Total Tweets: ${formatNumber(user.public_metrics.tweet_count)}`;
  }

  formatTweet(tweet: TwitterTweet, username: string): string {
    const date = new Date(tweet.created_at);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `📅 ${formattedDate}\n\n${tweet.text}\n\n❤️ ${formatNumber(tweet.public_metrics.like_count)} | 🔁 ${formatNumber(tweet.public_metrics.retweet_count)} | 💬 ${formatNumber(tweet.public_metrics.reply_count)}\n\nhttps://twitter.com/${username}/status/${tweet.id}`;
  }
}
