export interface SummaryOptions {
  type: 'brief' | 'detailed';
  maxSummaryLength?: number;
}

export function formatContentForSummary(title: string, content: string, metadata: { description?: string; author?: string; publishedDate?: string }, options: SummaryOptions): string {
  const parts: string[] = [];

  // Add title
  parts.push(`Title: ${title}`);

  // Add metadata if available
  if (metadata.author) {
    parts.push(`Author: ${metadata.author}`);
  }

  if (metadata.publishedDate) {
    parts.push(`Published: ${metadata.publishedDate}`);
  }

  if (metadata.description) {
    parts.push(`Description: ${metadata.description}`);
  }

  parts.push('---');

  // Add content with appropriate prompt based on summary type
  if (options.type === 'brief') {
    parts.push('Please provide a brief summary (2-3 sentences) of the following content:');
  } else {
    parts.push('Please provide a detailed summary of the following content, including key points, main arguments, and important details:');
  }

  parts.push('');
  parts.push(content);

  return parts.join('\n');
}

export function createSummaryPrompt(extractedContent: any, options: SummaryOptions): string {
  const { title, mainContent, description, author, publishedDate } = extractedContent;

  return formatContentForSummary(title, mainContent, { description, author, publishedDate }, options);
}
