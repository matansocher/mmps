import type { Bot } from 'grammy';
import { MessageLoader } from './message-loader';

describe('MessageLoader', () => {
  let api: Record<'setMessageReaction' | 'sendChatAction' | 'sendMessage' | 'deleteMessage', ReturnType<typeof vi.fn>>;
  let loader: MessageLoader;
  let onUnhandled: ReturnType<typeof vi.fn<(reason: unknown) => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      setMessageReaction: vi.fn().mockResolvedValue(true),
      sendChatAction: vi.fn().mockResolvedValue(true),
      sendMessage: vi.fn().mockResolvedValue({ message_id: 99 }),
      deleteMessage: vi.fn().mockResolvedValue(true),
    };
    loader = new MessageLoader({ api } as unknown as Bot, 1, 2, { loaderMessage: 'loading...', reactionEmoji: '👀' });
    onUnhandled = vi.fn<(reason: unknown) => void>();
    process.on('unhandledRejection', onUnhandled);
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await new Promise((resolve) => setImmediate(resolve));
    process.off('unhandledRejection', onUnhandled);
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it('should still run the action when the chat action fails', async () => {
    api.sendChatAction.mockRejectedValue(new Error('429'));
    const action = vi.fn().mockResolvedValue(undefined);

    await loader.handleMessageWithLoader(action);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should show the loader message after a delay and delete it when the action ends', async () => {
    await loader.handleMessageWithLoader(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(api.sendMessage).toHaveBeenCalledWith(1, 'loading...');
    expect(api.deleteMessage).toHaveBeenCalledWith(1, 99);
  });

  it('should contain a failed delayed loader message', async () => {
    api.sendMessage.mockRejectedValue(new Error('bot was blocked by the user'));
    const action = vi.fn(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    await loader.handleMessageWithLoader(action);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should delete a loader message that arrives after the action ended', async () => {
    let resolveSend: (value: { message_id: number }) => void;
    api.sendMessage.mockReturnValue(new Promise((resolve) => (resolveSend = resolve)));

    await loader.handleMessageWithLoader(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(api.deleteMessage).not.toHaveBeenCalled();

    resolveSend({ message_id: 77 });
    await vi.advanceTimersByTimeAsync(0);

    expect(api.deleteMessage).toHaveBeenCalledWith(1, 77);
  });
});
