import { AIMessage } from '@langchain/core/messages';
import { createMiddleware, providerStrategy } from 'langchain';
import { z } from 'zod';

export type StructuredResponseContext = {
  readonly responseSchema?: z.ZodTypeAny;
};

type ModelCallResult = { readonly structuredResponse: unknown; readonly messages: AIMessage[] };

function isStructuredResult(result: unknown): result is ModelCallResult {
  return typeof result === 'object' && result !== null && 'structuredResponse' in result && 'messages' in result;
}

// The provider's JSON mode replaces the reply text with JSON, so the caller's schema is wrapped
// in an envelope that also carries the user-facing reply text.
export function buildResponseEnvelope(responseSchema: z.ZodTypeAny) {
  return z.object({
    message: z.string().describe('The full reply to the user, formatted exactly as it should be sent'),
    data: responseSchema,
  });
}

// Lets a single agent return structured output per call: when the invocation context carries a
// `responseSchema`, the agent's final step produces it natively (with every tool result in view)
// instead of a second model call re-parsing the reply text. The JSON reply is swapped back to the
// plain message text so the checkpointed history stays readable for later turns.
export function createStructuredResponseMiddleware() {
  return createMiddleware({
    name: 'StructuredResponseMiddleware',
    wrapModelCall: async (request, handler) => {
      const responseSchema = (request.runtime.context as StructuredResponseContext | undefined)?.responseSchema;
      if (!responseSchema) {
        return handler(request);
      }

      const result: unknown = await handler({ ...request, responseFormat: providerStrategy(buildResponseEnvelope(responseSchema)) });
      if (!isStructuredResult(result)) {
        return result as Awaited<ReturnType<typeof handler>>;
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
