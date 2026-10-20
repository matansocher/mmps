import { AIMessage } from '@langchain/core/messages';
import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { createMiddleware, toolStrategy } from 'langchain';
import { z } from 'zod';

export type StructuredResponseContext = {
  readonly responseSchema?: z.ZodTypeAny;
};

type ModelCallResult = { readonly structuredResponse: unknown; readonly messages: AIMessage[] };

function isStructuredResult(result: unknown): result is ModelCallResult {
  return typeof result === 'object' && result !== null && 'structuredResponse' in result && 'messages' in result;
}

export const FINAL_REPLY_TOOL_NAME = 'final_reply';

// When the model calls final_reply in parallel with regular tools, langchain ends the turn and the other
// calls never run, so their results (e.g. match cards for the image) never reach the reply.
// Dropping final_reply instead lets the regular tools run; the model calls final_reply again afterwards.
// (A failed final_reply retry in the same situation leaves the other calls unanswered - see dangling-tool-calls.ts.)
function withoutFinalReply(response: AIMessage | undefined): AIMessage | undefined {
  const toolCalls = response?.tool_calls ?? [];
  const otherToolCalls = toolCalls.filter((toolCall) => toolCall.name !== FINAL_REPLY_TOOL_NAME);
  if (otherToolCalls.length === 0 || otherToolCalls.length === toolCalls.length) {
    return undefined;
  }
  return new AIMessage({
    content: response.content,
    id: response.id,
    tool_calls: otherToolCalls,
    additional_kwargs: response.additional_kwargs,
    response_metadata: response.response_metadata,
    usage_metadata: response.usage_metadata,
  });
}

// The final answer is returned as a tool call, so the caller's schema is wrapped in an envelope
// that also carries the user-facing reply text.
export function buildResponseEnvelope(responseSchema: z.ZodTypeAny) {
  return z.object({
    message: z.string().describe('The full reply to the user, formatted exactly as it should be sent'),
    data: responseSchema,
  });
}

// The title becomes the tool name (otherwise langchain generates `extract-N`).
function buildFinalReplyToolSchema(responseSchema: z.ZodTypeAny) {
  return {
    ...(toJsonSchema(buildResponseEnvelope(responseSchema)) as Record<string, unknown>),
    type: 'object' as const,
    title: FINAL_REPLY_TOOL_NAME,
    description: 'Send the final reply to the user. Call this once, after all other tools have returned.',
  };
}

// Lets a single agent return structured output per call: when the invocation context carries a
// `responseSchema`, the agent's final step produces it natively (with every tool result in view)
// instead of a second model call re-parsing the reply text. The final-reply tool call is swapped back
// to the plain message text so the checkpointed history stays readable for later turns.
// toolStrategy (not providerStrategy): OpenAI's JSON-schema response_format forces every bound tool
// into strict mode, which rejects tools with optional fields (e.g. weather's `date`).
export function createStructuredResponseMiddleware() {
  return createMiddleware({
    name: 'StructuredResponseMiddleware',
    wrapModelCall: async (request, handler) => {
      const responseSchema = (request.runtime.context as StructuredResponseContext | undefined)?.responseSchema;
      if (!responseSchema) {
        return handler(request);
      }

      const result: unknown = await handler({ ...request, responseFormat: toolStrategy(buildFinalReplyToolSchema(responseSchema)) });
      if (!isStructuredResult(result)) {
        return result as Awaited<ReturnType<typeof handler>>;
      }

      const toolsOnlyResponse = withoutFinalReply(result.messages[0]);
      if (toolsOnlyResponse) {
        return toolsOnlyResponse as unknown as Awaited<ReturnType<typeof handler>>;
      }

      const envelope = result.structuredResponse as z.infer<ReturnType<typeof buildResponseEnvelope>>;
      const original = result.messages[0];
      const textMessage = new AIMessage({
        content: envelope.message,
        id: original?.id,
        response_metadata: original?.response_metadata,
        usage_metadata: original?.usage_metadata,
      });
      return { structuredResponse: envelope.data, messages: [textMessage] } as unknown as Awaited<ReturnType<typeof handler>>;
    },
  });
}
