import { provideGeminiClient } from '../provide-gemini-client';

export async function getChatCompletion(prompt: string, userText: string | unknown[]): Promise<string> {
  const flashModel = provideGeminiClient();
  let finalPrompt = `${prompt}.\n\n`;

  if (typeof userText === 'string') {
    finalPrompt += userText;
  } else {
    // array
    finalPrompt += userText.join('.');
  }

  const result = await flashModel.generateContent(finalPrompt);
  return result.response.text();
}
