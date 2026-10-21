import { readYouTubeQueueConfig, YouTubeCollectionQueue } from '@services/youtube-collection-queue';
import { ensureYouTubeCollectionIndexes } from './collection.repository';
import { closeYouTubeCollection, initYouTubeCollection } from './youtube-collection.init';

const { init, close } = vi.hoisted(() => ({ init: vi.fn(), close: vi.fn() }));
vi.mock('@services/youtube-collection-queue', () => ({
  readYouTubeQueueConfig: vi.fn(),
  YouTubeCollectionQueue: vi.fn(
    class {
      init = init;
      close = close;
      publish = vi.fn();
    },
  ),
}));
vi.mock('./collection.repository', () => ({ ensureYouTubeCollectionIndexes: vi.fn() }));

describe('YouTube collection lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not create a client or indexes in default direct mode', async () => {
    vi.mocked(readYouTubeQueueConfig).mockReturnValue(null);
    expect(await initYouTubeCollection()).toBeNull();
    expect(YouTubeCollectionQueue).not.toHaveBeenCalled();
    expect(ensureYouTubeCollectionIndexes).not.toHaveBeenCalled();
  });

  it('validates persistence before opening the queue, then closes on shutdown', async () => {
    vi.mocked(readYouTubeQueueConfig).mockReturnValue({ projectId: 'project' } as never);
    const service = await initYouTubeCollection();
    expect(service).toBeTruthy();
    expect(ensureYouTubeCollectionIndexes).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(expect.any(Function));
    await closeYouTubeCollection();
    expect(close).toHaveBeenCalledOnce();
  });

  it('cleans up metadata failures and never silently falls back to direct', async () => {
    vi.mocked(readYouTubeQueueConfig).mockReturnValue({ projectId: 'project' } as never);
    init.mockRejectedValueOnce(new Error('bad metadata'));
    await expect(initYouTubeCollection()).rejects.toThrow('bad metadata');
    expect(close).toHaveBeenCalledOnce();
  });
});
