import { IMAGE_GENERATION_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function createImage(prompt: string): Promise<string> {
  const client = provideOpenAiClient();
  const response = await client.images.generate({
    model: IMAGE_GENERATION_MODEL,
    prompt,
    n: 1,
    size: '1024x1024',
  });
  return response.data[0].url;
}
