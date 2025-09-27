import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createSummaryPrompt, extractContent, fetchPage } from './utils';

const schema = z.object({
  url: z.string().describe('The URL of the web page to read and summarize'),
  summaryType: z.enum(['brief', 'detailed']).optional().default('brief').describe('Type of summary: brief (2-3 sentences) or detailed (comprehensive)'),
  maxLength: z.number().optional().default(5000).describe('Maximum number of characters to extract from the page'),
});

async function runner({ url, summaryType, maxLength }: z.infer<typeof schema>) {
  try {
    // Step 1: Fetch the page
    const { html } = await fetchPage(url);

    // Step 2: Extract content
    const extractedContent = extractContent(html, maxLength);

    // Step 3: Format the response
    const result = {
      url,
      title: extractedContent.title,
      author: extractedContent.author,
      publishedDate: extractedContent.publishedDate,
      description: extractedContent.description,
      imageUrl: extractedContent.imageUrl,
      contentLength: extractedContent.mainContent.length,
      extractedContent: extractedContent.mainContent,
      summaryPrompt: createSummaryPrompt(extractedContent, { type: summaryType }),
    };

    // Create a formatted response
    const formattedResponse: string[] = [];

    formattedResponse.push(`📄 **Web Page Analysis**`);
    formattedResponse.push(`🔗 URL: ${url}`);
    formattedResponse.push(`📌 Title: ${result.title}`);

    if (result.author) {
      formattedResponse.push(`✍️ Author: ${result.author}`);
    }

    if (result.publishedDate) {
      formattedResponse.push(`📅 Published: ${result.publishedDate}`);
    }

    if (result.description) {
      formattedResponse.push(`📝 Description: ${result.description}`);
    }

    formattedResponse.push(`📊 Content Length: ${result.contentLength} characters`);
    formattedResponse.push('');
    formattedResponse.push('---');
    formattedResponse.push('');

    // Add summary instruction for the AI
    if (summaryType === 'brief') {
      formattedResponse.push('**Brief Summary:**');
      formattedResponse.push('Based on the extracted content below, here is a concise summary:');
    } else {
      formattedResponse.push('**Detailed Summary:**');
      formattedResponse.push('Based on the extracted content below, here is a comprehensive summary:');
    }

    formattedResponse.push('');
    formattedResponse.push('---');
    formattedResponse.push('');
    formattedResponse.push('**Extracted Content:**');
    formattedResponse.push(result.extractedContent);

    // Return the formatted response
    return formattedResponse.join('\n');
  } catch (error) {
    // Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return `❌ **Error Reading Web Page**\n\n` + `URL: ${url}\n` + `Error: ${errorMessage}\n\n` + `Please check if the URL is correct and the website is accessible.`;
  }
}

export const webScraperTool = tool(runner, {
  name: 'web_scraper',
  description:
    'Read and analyze web pages. Extracts the main content from a URL and provides both the raw content and metadata. The AI will then summarize the content based on the specified summary type.',
  schema,
});
