import type { Response as OpenAIResponse } from 'openai/resources/responses/responses';
import { CHAT_MODEL, CHAT_MODEL_REASONING_EFFORT } from '@services/openai/constants';
import { provideOpenAiClient } from '@services/openai/provide-openai-client';

type WebSearchCitation = {
  readonly title: string;
  readonly url: string;
};

type GetWebSearchResponseOptions = {
  readonly input: string;
  readonly instructions?: string;
  readonly model?: string;
};

type GetWebSearchResponseRes = {
  readonly text: string;
  readonly citations: readonly WebSearchCitation[];
};

function extractCitations(response: OpenAIResponse): WebSearchCitation[] {
  const citations = new Map<string, WebSearchCitation>();
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content.type !== 'output_text') continue;
      for (const annotation of content.annotations ?? []) {
        if (annotation.type !== 'url_citation' || !annotation.url) continue;
        citations.set(annotation.url, { title: annotation.title || annotation.url, url: annotation.url });
      }
    }
  }
  return [...citations.values()];
}

export async function getWebSearchResponse(options: GetWebSearchResponseOptions): Promise<GetWebSearchResponseRes> {
  const { input, instructions, model = CHAT_MODEL } = options;
  const client = provideOpenAiClient();
  const response = (await client.responses.create({
    model,
    reasoning: { effort: CHAT_MODEL_REASONING_EFFORT },
    ...(instructions ? { instructions } : {}),
    input,
    tools: [{ type: 'web_search' }],
  })) as OpenAIResponse;
  return { text: response.output_text, citations: extractCitations(response) };
}
