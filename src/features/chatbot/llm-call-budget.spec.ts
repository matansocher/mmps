import { AIMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { fakeModel } from 'langchain';
import { recordModelUsage } from '@shared/ai';
import { weatherTool } from '@shared/ai/tools';
import { expectLogs } from '@test/expect-logs';
import { ChatbotService } from './chatbot.service';

// Guards the per-turn LLM call budget of the real ChatbotService (agent + full middleware stack),
// with fake models so it runs offline on every PR. A regression like #681 (a summary on every
// turn) doubles latency without failing any functional test; these budgets make it fail CI.

type FakeModel = ReturnType<typeof fakeModel>;
type TurnUsage = { readonly llmCalls: number; readonly toolCalls: number };

const models = vi.hoisted(() => ({ main: undefined as unknown, summary: undefined as unknown }));

vi.mock('@langchain/openai', async (importOriginal) => {
  const { GPT_SMALL_MODEL } = await import('@services/openai/constants');
  return {
    ...(await importOriginal<typeof import('@langchain/openai')>()),
    ChatOpenAI: vi.fn(function ({ model }: { model: string }) {
      return model === GPT_SMALL_MODEL ? models.summary : models.main;
    }),
  };
});

vi.mock('@shared/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/ai')>()),
  recordModelUsage: vi.fn(),
}));

const REPLY = 'x'.repeat(1200); // ~300 estimated tokens, a typical chatty reply
const CHAT_ID = 123;

function textReplies(model: FakeModel, count: number): FakeModel {
  for (let i = 0; i < count; i++) model.respond(new AIMessage(REPLY));
  return model;
}

function setup(main: FakeModel) {
  const summary = textReplies(fakeModel(), 10);
  models.main = main;
  models.summary = summary;
  return { service: new ChatbotService(new MemorySaver()), main, summary };
}

function lastTurnUsage(): TurnUsage {
  const { handler } = vi.mocked(recordModelUsage).mock.lastCall[0];
  return handler.summary();
}

describe('chatbot LLM call budget', () => {
  beforeEach(() => {
    vi.mocked(recordModelUsage).mockClear();
  });

  it('should answer a simple greeting with a single model call and no summary', async () => {
    expectLogs('warn', 'No price configured for model "unknown"; reporting cost 0');
    const { service, main, summary } = setup(textReplies(fakeModel(), 1));

    await service.processMessage('how are you?', CHAT_ID);

    expect(main.callCount).toEqual(1);
    expect(summary.callCount).toEqual(0);
    expect(lastTurnUsage()).toEqual(expect.objectContaining({ llmCalls: 1, toolCalls: 0 }));
  });

  it('should answer a single-tool question with two model calls and one tool call', async () => {
    expectLogs('warn', 'No price configured for model "unknown"; reporting cost 0');
    vi.spyOn(weatherTool as unknown as { func: () => Promise<string> }, 'func').mockResolvedValue('sunny, 25°C');
    const main = textReplies(fakeModel().respondWithTools([{ name: 'weather', args: { action: 'current', location: 'Tel Aviv' } }]), 1);
    const { service, summary } = setup(main);

    await service.processMessage('what is the weather in Tel Aviv?', CHAT_ID);

    expect(main.callCount).toEqual(2);
    expect(summary.callCount).toEqual(0);
    expect(lastTurnUsage()).toEqual(expect.objectContaining({ llmCalls: 2, toolCalls: 1 }));
  });

  it('should not summarize on consecutive turns during a long chatty conversation', async () => {
    const turns = 40;
    const { service, main, summary } = setup(textReplies(fakeModel(), turns));
    const summaryCallsPerTurn: number[] = [];

    for (let turn = 0; turn < turns; turn++) {
      const before = summary.callCount;
      await service.processMessage(`short question ${turn}`, CHAT_ID);
      summaryCallsPerTurn.push(summary.callCount - before);
    }

    expect(main.callCount).toEqual(turns);
    expect(summaryCallsPerTurn.some((calls, i) => calls > 0 && summaryCallsPerTurn[i - 1] > 0)).toEqual(false);
    expect(summary.callCount).toBeLessThanOrEqual(2);
  });
});
