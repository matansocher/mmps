import cron from 'node-cron';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { socialMediaCollect } from './schedulers';

vi.mock('node-cron', () => ({ default: { schedule: vi.fn() } }));
vi.mock('./chatbot.service', () => ({ ChatbotService: vi.fn() }));
vi.mock('./schedulers', () => ({ socialMediaCollect: vi.fn() }));

describe('YouTube scheduler routing', () => {
  beforeEach(() => vi.clearAllMocks());

  function handler(queue: unknown = null): () => Promise<void> {
    new ChatbotSchedulerService({} as never, {} as never, {} as never, queue as never).init();
    const call = vi.mocked(cron.schedule).mock.calls.find(([expression]) => expression === '30 11,15,19,23 * * *');
    expect(call[2]).toEqual({ timezone: 'Asia/Jerusalem' });
    return call[1] as () => Promise<void>;
  }

  it('retains direct X and YouTube collection by default on the original schedule', async () => {
    await handler()();
    expect(socialMediaCollect).toHaveBeenCalledWith(['twitter', 'youtube']);
  });

  it('only queues YouTube in pubsub mode and leaves other crons unchanged', async () => {
    const publish = vi.fn();
    await handler({ publish })();
    expect(publish).toHaveBeenCalledOnce();
    expect(socialMediaCollect).toHaveBeenCalledWith(['twitter']);
    expect(socialMediaCollect).not.toHaveBeenCalledWith(expect.arrayContaining(['youtube']));
    const expressions = vi.mocked(cron.schedule).mock.calls.map(([expression]) => expression);
    expect(expressions).toContain('45 22 * * *');
    expect(expressions).toContain('30 18 * * *');
    expect(expressions).toContain('30 * * * *');
  });

  it('still runs X when queue publishing fails', async () => {
    await handler({ publish: vi.fn().mockRejectedValue(new Error('publish failed')) })();
    expect(socialMediaCollect).toHaveBeenCalledWith(['twitter']);
  });
});
