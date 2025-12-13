import { getChatCompletion } from '@services/openai';

export async function generateSummary(transcript: string): Promise<string> {
  try {
    if (transcript.length < 100) {
      return transcript;
    }

    const systemPrompt = 'You are a helpful assistant that summarizes video transcripts concisely.';
    const userMessage = `Summarize this video transcript in 2-3 concise sentences:\n\n${transcript.substring(0, 2000)}`;

    const summary = await getChatCompletion(systemPrompt, userMessage);
    return summary.trim();
  } catch {
    return '';
  }
}
