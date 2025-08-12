import { GPT_5_MODEL } from '@services/openai/constants';
import { provideOpenAiClient } from '@services/openai/provide-openai-client';

type GetResponseOptions = {
  input: string;
  instructions: string;
  previousResponseId?: string;
  model?: string;
};

type GetResponseRes = {
  id: string;
  text: string;
};

export async function getResponse({ input, instructions, previousResponseId, model = GPT_5_MODEL }: GetResponseOptions): Promise<GetResponseRes> {
  const client = provideOpenAiClient();
  const response = await client.responses.create({
    model,
    store: true,
    instructions,
    input,
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
  });
  return { id: response.id, text: response.output_text };
}
