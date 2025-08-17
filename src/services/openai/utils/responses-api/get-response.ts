import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { CHAT_COMPLETIONS_MODEL } from '@services/openai/constants';
import { provideOpenAiClient } from '@services/openai/provide-openai-client';

type GetResponseOptions<T extends z.ZodTypeAny> = {
  input: string;
  instructions: string;
  store?: boolean;
  previousResponseId?: string;
  model?: string;
  schema: T;
};

type GetResponseRes<T> = {
  id: string;
  result: T;
};

function createRequestOptions<T extends z.ZodTypeAny>(options: GetResponseOptions<T>) {
  const { input, store = true, instructions, previousResponseId, model = CHAT_COMPLETIONS_MODEL, schema } = options;
  return {
    model,
    store,
    instructions,
    input,
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    text: { format: zodTextFormat(schema, 'something') },
  };
}

export async function getResponse<T extends z.ZodTypeAny>(options: GetResponseOptions<T>): Promise<GetResponseRes<z.infer<T>>> {
  const client = provideOpenAiClient();
  const response = await client.responses.parse(createRequestOptions<T>(options));
  return { id: response.id, result: JSON.parse(response.output_text) as z.infer<T> };
}
