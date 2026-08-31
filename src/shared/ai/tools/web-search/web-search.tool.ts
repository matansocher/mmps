import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getWebSearchResponse } from '@services/openai';

const schema = z.object({
  query: z.string().describe('The search query or question to look up on the web. Be specific and include any relevant context.'),
});

async function runner({ query }: z.infer<typeof schema>) {
  const { text, citations } = await getWebSearchResponse({
    input: query,
    instructions: 'You are a web search assistant. Answer the query using up-to-date information from the web. Be concise and factual, and rely on the search results.',
  });

  return {
    query,
    answer: text,
    sources: citations.map((c) => ({ title: c.title, url: c.url })),
  };
}

export const webSearchTool = tool(runner, {
  name: 'web_search',
  description:
    'Search the internet for real-time, up-to-date information (news, current events, prices, facts, recent developments, or anything not in your training data). Use this whenever the user asks about something recent or that requires live web results, similar to searching on Google or ChatGPT. Returns an answer plus source links.',
  schema,
});
