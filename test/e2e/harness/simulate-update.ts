import type { Update } from 'grammy/types';
import type { CapturedCall } from './mock-transport';
import type { TestBot } from './create-test-bot';

export type SimulateResult = {
  readonly calls: ReadonlyArray<CapturedCall>;
};

export async function simulateUpdate(testBot: TestBot, update: Update): Promise<SimulateResult> {
  const callsBefore = testBot.transport.calls.length;
  await testBot.bot.handleUpdate(update);
  const newCalls = testBot.transport.calls.slice(callsBefore);
  return { calls: newCalls };
}
