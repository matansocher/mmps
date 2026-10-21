import { getVideosFromRSS } from './api';

const feed = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><yt:videoId>video</yt:videoId><title>Title</title><published>2026-01-01T00:00:00Z</published></entry></feed>';

describe('bounded YouTube RSS fetching', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches and parses the official feed with a timeout signal', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(feed));
    vi.stubGlobal('fetch', fetch);
    expect(await getVideosFromRSS('UCchannel')).toEqual([expect.objectContaining({ id: 'video', title: 'Title' })]);
    expect(fetch).toHaveBeenCalledWith('https://www.youtube.com/feeds/videos.xml?channel_id=UCchannel', { signal: expect.any(AbortSignal) });
  });

  it('passes the shutdown cancellation signal through', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('<feed></feed>'));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    await getVideosFromRSS('UCchannel', signal);
    expect(fetch.mock.calls[0][1].signal).toBe(signal);
  });

  it.each([
    { body: 'html error page', error: 'Malformed' },
    { body: 'x'.repeat(1024 * 1024 + 1), error: '1 MiB' },
    { body: `<feed>${'<entry><yt:videoId>x</yt:videoId></entry>'.repeat(101)}</feed>`, error: '100 videos' },
  ])('rejects invalid or oversized responses ($error)', async ({ body, error }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    await expect(getVideosFromRSS('UCchannel')).rejects.toThrow(error);
  });

  it('propagates HTTP failures instead of returning an empty success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(getVideosFromRSS('UCchannel')).rejects.toThrow('503');
  });
});
