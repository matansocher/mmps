import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatUserDisplay, searchTikTokUsers } from '@services/tiktok';

const name = 'tiktok_search';
const description = 'Search for TikTok users by username or name. Returns a list of matching users with their details.';

const schema = z.object({
  query: z.string().describe('The search query - can be a username, name, or partial match'),
});

async function func({ query }: z.infer<typeof schema>) {
  try {
    const sanitizedQuery = query
      .trim()
      .replace(/[@#]/g, '')
      .replace(/[^\w\s.-]/g, '')
      .substring(0, 50);

    if (!sanitizedQuery) {
      return 'Please provide a valid search query.';
    }

    const searchResults = await searchTikTokUsers(sanitizedQuery);

    if (searchResults.length === 0) {
      return `No TikTok users found for "${sanitizedQuery}". Please try a different search term or check the spelling.`;
    }

    const formattedResults = searchResults
      .map((user) => {
        const display = formatUserDisplay(user);
        return `• ${display}`;
      })
      .join('\n');

    return `Found ${searchResults.length} user${searchResults.length > 1 ? 's' : ''} for "${sanitizedQuery}":\n\n${formattedResults}\n\nTo follow a user, use their username with the subscription tool.`;
  } catch (error) {
    console.error('Error searching TikTok users:', error);
    return `Error searching for TikTok users: ${error.message}`;
  }
}

export const tiktokSearchTool = new DynamicStructuredTool({
  name,
  description,
  schema,
  func,
});
