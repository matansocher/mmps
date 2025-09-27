export interface SummaryOptions {
  type: 'brief' | 'detailed' | 'comprehensive' | 'outline' | 'key-points';
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
  switch (options.type) {
    case 'brief':
      parts.push('Please provide a brief summary (2-3 sentences) of the following content:');
      break;
    case 'detailed':
      parts.push('Please provide a detailed summary (1-2 paragraphs) of the following content, including key points, main arguments, and important details:');
      break;
    case 'comprehensive':
      parts.push('Please provide a comprehensive analysis of the following content. Include:');
      parts.push('1. Main thesis or central argument');
      parts.push('2. All key points and supporting arguments');
      parts.push('3. Important examples, data, or evidence presented');
      parts.push('4. Any conclusions or recommendations');
      parts.push('5. Notable quotes or insights');
      parts.push('Make this summary thorough and complete, capturing all significant information:');
      break;
    case 'outline':
      parts.push('Please create a structured outline of the following content with:');
      parts.push('• Main topics as primary bullets');
      parts.push('• Subtopics and supporting points as nested bullets');
      parts.push('• Key facts, figures, or examples under relevant points');
      parts.push('Format as a hierarchical bullet-point outline:');
      break;
    case 'key-points':
      parts.push('Please extract and list the 7-10 most important points from the following content.');
      parts.push('For each point, provide:');
      parts.push('• The key insight or claim');
      parts.push('• Brief supporting context (1-2 sentences)');
      parts.push('Focus on the most significant and actionable information:');
      break;
    default:
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
