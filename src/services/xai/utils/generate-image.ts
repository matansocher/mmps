import { IMAGE_GENERATION_MODEL } from '../constants';
import { provideXAiClient } from '../provide-xai-client';

export async function generateImage(prompt: string): Promise<string> {
  const client = provideXAiClient();
  const response = await client.images.generate({
    model: IMAGE_GENERATION_MODEL,
    prompt,
    n: 1,
    response_format: 'url',
  });
  return response.data[0].url;
}
