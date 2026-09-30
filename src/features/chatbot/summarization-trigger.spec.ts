import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { summarizationMiddleware } from 'langchain';
import { CHATBOT_CONFIG, CHATBOT_SUMMARIZATION_TRIGGER } from './chatbot.config';

type BeforeModel = (state: { messages: BaseMessage[] }, runtime: unknown) => Promise<{ messages: BaseMessage[] } | undefined>;

const PAD = 'x'.repeat(900); // ~225 estimated tokens per message

function createSummarizer() {
  const model = new FakeListChatModel({ responses: Array(20).fill('summary of older turns') });
  const invokeSpy = vi.spyOn(model, 'invoke');
  const middleware = summarizationMiddleware({ model, trigger: CHATBOT_SUMMARIZATION_TRIGGER, keep: { tokens: CHATBOT_CONFIG.summarization.keepTokens } });
  const beforeModel = (middleware as unknown as { beforeModel: BeforeModel }).beforeModel;
  return { invokeSpy, run: (messages: BaseMessage[]) => beforeModel({ messages }, { context: {} }) };
}

function history(pairs: number, content = PAD): BaseMessage[] {
  return Array.from({ length: pairs }, (_, i) => [new HumanMessage(`q${i} ${content}`), new AIMessage(`a${i} ${content}`)]).flat();
}

// Strips the leading RemoveMessage so the result is the persisted thread.
function applyUpdate(messages: BaseMessage[], update: { messages: BaseMessage[] } | undefined): BaseMessage[] {
  return update ? update.messages.slice(1) : messages;
}

describe('chatbot summarization trigger', () => {
  it('should not re-summarize on every turn once the retained tail holds ~40 short messages', async () => {
    const { invokeSpy, run } = createSummarizer();
    let messages = history(20);

    for (let turn = 0; turn < 5; turn++) {
      messages.push(new HumanMessage(`turn ${turn}`));
      messages = applyUpdate(messages, await run(messages));
      messages.push(new AIMessage(`reply ${turn} ${PAD}`));
    }

    expect(invokeSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('should still summarize a long thread past the message count once it reaches the token floor', async () => {
    const { invokeSpy, run } = createSummarizer();
    const messages = history(20, 'x'.repeat(1800)); // 40 messages, ~18k tokens

    const update = await run(messages);

    expect(update).toBeDefined();
    expect(invokeSpy).toHaveBeenCalledTimes(1);
  });

  it('should summarize a short thread once it passes the token budget', async () => {
    const { run } = createSummarizer();
    const messages = history(3, 'x'.repeat(20_000)); // 6 messages, ~30k tokens

    expect(await run(messages)).toBeDefined();
  });
});
