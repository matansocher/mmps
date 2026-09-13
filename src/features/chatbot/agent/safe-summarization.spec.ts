import { HumanMessage, RemoveMessage } from '@langchain/core/messages';
import { createSafeSummarizationMiddleware } from './safe-summarization';

const beforeModelMock = vi.fn();

vi.mock('langchain', () => ({
  summarizationMiddleware: vi.fn(() => ({ name: 'SummarizationMiddleware', beforeModel: (state: unknown, runtime: unknown) => beforeModelMock(state, runtime) })),
}));

function summaryUpdate(summaryText: string) {
  return {
    messages: [
      new RemoveMessage({ id: '__remove_all__' }),
      new HumanMessage({ content: `Here is a summary of the conversation to date:\n\n${summaryText}`, additional_kwargs: { lc_source: 'summarization' } }),
      new HumanMessage({ content: 'recent message' }),
    ],
  };
}

describe('createSafeSummarizationMiddleware', () => {
  beforeEach(() => {
    beforeModelMock.mockReset();
  });

  it('should pass a valid summary update through unchanged', async () => {
    const update = summaryUpdate('The user asked about the weather and their calendar.');
    beforeModelMock.mockResolvedValue(update);

    const middleware = createSafeSummarizationMiddleware({} as never) as { beforeModel: (s: unknown, r: unknown) => Promise<unknown> };
    const result = await middleware.beforeModel({}, {});

    expect(result).toBe(update);
  });

  it('should drop an error-shaped summary update to preserve history', async () => {
    beforeModelMock.mockResolvedValue(summaryUpdate('Error generating summary: Error: request timed out'));

    const middleware = createSafeSummarizationMiddleware({} as never) as { beforeModel: (s: unknown, r: unknown) => Promise<unknown> };
    const result = await middleware.beforeModel({}, {});

    expect(result).toBeUndefined();
  });

  it('should pass through when the trigger did not fire (no update)', async () => {
    beforeModelMock.mockResolvedValue(undefined);

    const middleware = createSafeSummarizationMiddleware({} as never) as { beforeModel: (s: unknown, r: unknown) => Promise<unknown> };
    const result = await middleware.beforeModel({}, {});

    expect(result).toBeUndefined();
  });
});
