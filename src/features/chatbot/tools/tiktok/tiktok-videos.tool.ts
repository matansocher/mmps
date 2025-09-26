import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTikTokTranscript, getTikTokUserVideos } from '@services/tiktok';
import { getFollowedChannels } from '@shared/tiktok';

const name = 'tiktok_videos';
const description = 'Get recent videos from TikTok channels, including transcripts and summaries.';

const schema = z.object({
  action: z.enum(['recent', 'today', 'transcript']).describe("The action to perform - get recent videos, today's videos, or get a transcript"),
  username: z.string().optional().describe('The TikTok username to get videos from (optional for today action)'),
  videoId: z.string().optional().describe('The video ID to get transcript for (required for transcript action)'),
  limit: z.number().optional().default(5).describe('Maximum number of videos to return (default: 5)'),
});

async function func({ action, username, videoId, limit }: z.infer<typeof schema>) {
  try {
    switch (action) {
      case 'recent': {
        if (!username) {
          return 'Please provide a username to get videos from.';
        }

        const sanitizedUsername = username.replace(/[@#]/g, '').trim();
        const videos = await getTikTokUserVideos(sanitizedUsername);

        if (!videos || videos.length === 0) {
          return `No videos found for @${sanitizedUsername}`;
        }

        const recentVideos = videos.slice(0, limit);
        const videoList = recentVideos
          .map((video, index) => {
            const videoUrl = `https://www.tiktok.com/@${sanitizedUsername}/video/${video.id}`;
            return `${index + 1}. ${video.uploadDate || 'Unknown date'} - ${videoUrl}`;
          })
          .join('\n');

        return `📹 Recent videos from @${sanitizedUsername}:\n\n${videoList}`;
      }

      case 'today': {
        const today = new Date().toISOString().split('T')[0];
        const channels = username ? [{ username: username.replace(/[@#]/g, '').trim() }] : await getFollowedChannels();

        if (!channels.length) {
          return 'No channels to check. Please specify a username or follow some channels first.';
        }

        const allTodayVideos = [];

        for (const channel of channels) {
          const videos = await getTikTokUserVideos(channel.username);
          const todayVideos = videos.filter((video) => video.uploadDate === today);

          if (todayVideos.length > 0) {
            allTodayVideos.push({
              username: channel.username,
              videos: todayVideos,
            });
          }
        }

        if (allTodayVideos.length === 0) {
          return `No new videos today from ${username ? `@${username}` : 'your followed channels'}.`;
        }

        const videoList = allTodayVideos
          .map(({ username, videos }) => {
            const channelVideos = videos
              .map((video) => {
                const videoUrl = `https://www.tiktok.com/@${username}/video/${video.id}`;
                return `  • ${videoUrl}`;
              })
              .join('\n');

            return `@${username}:\n${channelVideos}`;
          })
          .join('\n\n');

        return `🎬 Today's new videos:\n\n${videoList}`;
      }

      case 'transcript': {
        if (!username || !videoId) {
          return 'Please provide both username and video ID to get a transcript.';
        }

        const sanitizedUsername = username.replace(/[@#]/g, '').trim();
        const transcript = await getTikTokTranscript(sanitizedUsername, videoId);

        if (!transcript || !transcript.text) {
          return `Could not get transcript for video ${videoId} from @${sanitizedUsername}`;
        }

        const videoUrl = `https://www.tiktok.com/@${sanitizedUsername}/video/${videoId}`;

        return `📝 Transcript for ${videoUrl}:\n\n${transcript.text}`;
      }

      default:
        return 'Invalid action. Please use "recent", "today", or "transcript".';
    }
  } catch (error) {
    console.error('Error getting TikTok videos:', error);
    return `Error getting videos: ${error.message}`;
  }
}

export const tiktokVideosTool = new DynamicStructuredTool({
  name,
  description,
  schema,
  func,
});
