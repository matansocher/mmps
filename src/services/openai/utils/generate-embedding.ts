import { provideOpenAiClient } from '../provide-openai-client';

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = provideOpenAiClient();
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
    dimensions: 1024,
  });

  return response.data[0].embedding;
}
