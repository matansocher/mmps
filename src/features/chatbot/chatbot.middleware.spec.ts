import { ChatOpenAI } from '@langchain/openai';
import { createChatbotMiddleware } from './chatbot.middleware';

describe('createChatbotMiddleware()', () => {
  it('should build the production stack in order', () => {
    const model = new ChatOpenAI({ model: 'gpt-4.1-mini', apiKey: 'test' });

    const names = createChatbotMiddleware(model).map((middleware) => middleware.name);

    expect(names).toEqual(['SummarizationMiddleware', 'ModelCallLimitMiddleware', 'ToolCallLimitMiddleware', 'ToolRetryMiddleware']);
  });
});
