import { IMAGE_ANALYZER_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function analyzeImage(prompt: string, imageUrl: string): Promise<string> {
  const client = provideOpenAiClient();
  const response = await client.chat.completions.create({
    model: IMAGE_ANALYZER_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  });
  return response.choices[0].message.content;
}
