import { CHAT_COMPLETIONS_MODEL } from '@services/openai/constants';
import { provideOpenAiClient } from '@services/openai/provide-openai-client';

type GetStreamingResponseOptions = {
  readonly input: string;
  readonly instructions: string;
  readonly store?: boolean;
  readonly previousResponseId?: string;
  readonly model?: string;
};

export type StreamChunk = {
  readonly delta: string;
  readonly fullText: string;
};

type GetStreamingResponseResult = {
  readonly id: string;
  readonly result: string;
};

export async function getStreamingResponse(options: GetStreamingResponseOptions, onChunk: (chunk: StreamChunk) => void | Promise<void>): Promise<GetStreamingResponseResult> {
  const { input, store = true, instructions, previousResponseId, model = CHAT_COMPLETIONS_MODEL } = options;
  const client = provideOpenAiClient();

  const stream = client.responses.stream({
    model,
    store,
    instructions,
    input,
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      const delta = (event as any).delta as string;
      fullText += delta;
      await onChunk({ delta, fullText });
    }
  }

  const finalResponse = await stream.finalResponse();

  return { id: finalResponse.id, result: fullText };
}
