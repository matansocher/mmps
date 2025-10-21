import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchYouTubeVideos } from '@services/youtube';

const schema = z.object({
  query: z.string().describe('The search query to find YouTube videos'),
  maxResults: z.number().optional().default(5).describe('Maximum number of results to return (default: 5, max: 10)'),
});

async function runner({ query, maxResults = 5 }: z.infer<typeof schema>) {
  const limitedMaxResults = Math.min(maxResults, 10);

  const result = await searchYouTubeVideos(query, limitedMaxResults);

  if (!result.success || !result.videos) {
    throw new Error(result.error || 'Failed to search YouTube videos');
  }

  let response = `**YouTube Search Results for "${query}":**\n\n`;

  result.videos.forEach((video, index) => {
    response += `**${index + 1}. ${video.title}**\n`;
    response += `   🎥 Channel: ${video.channelTitle}\n`;
    response += `   🔗 Link: ${video.url}\n`;

    // Clean up description - remove extra whitespace and limit length
    const cleanDescription = video.description.replace(/\s+/g, ' ').trim();
    const shortDescription = cleanDescription.length > 150 ? cleanDescription.substring(0, 150) + '...' : cleanDescription;

    if (shortDescription) {
      response += `   📝 ${shortDescription}\n`;
    }

    // Format published date
    const publishedDate = new Date(video.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    response += `   📅 Published: ${publishedDate}\n\n`;
  });

  return response;
}

export const youtubeTool = tool(runner, {
  name: 'youtube_search',
  description:
    'Search for YouTube videos by query. Returns a list of videos with titles, channel names, descriptions, publish dates, and direct links to watch. Perfect for finding tutorials, music, reviews, or any video content.',
  schema,
});
