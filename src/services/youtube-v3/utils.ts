export function parseTranscriptXml(xml: string): string {
  // Simple regex-based parsing to avoid heavy XML dependencies
  const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  return matches
    .map((match) => {
      let text = match[1];
      // Basic HTML entity decoding
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\s*/g, ' ');
      return text;
    })
    .join(' ');
}
