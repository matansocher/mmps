import { getChatCompletion } from '@services/openai';

export async function generateSummary(transcript: string): Promise<string> {
  try {
    if (transcript.length < 100) {
      return transcript;
    }

    const systemPrompt = 'You are a helpful assistant that summarizes video transcripts concisely. Always summarize in the same language as the transcript provided.';
    const userMessage = `Summarize this video transcript in 1-2 paragraphs:\n\n${transcript}`;

    const summary = await getChatCompletion(systemPrompt, userMessage);
    return summary.trim();
  } catch {
    return '';
  }
}
