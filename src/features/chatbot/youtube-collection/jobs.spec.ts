import { parseYouTubeCollectionJob, youtubeJobId } from './jobs';

const now = new Date('2026-10-15T12:00:00Z');
const job = { version: 1, subscriptionId: '0123456789abcdef01234567', scheduledAt: now.toISOString() };

describe('YouTube collection jobs', () => {
  it('validates a small versioned envelope and deterministic identity', () => {
    expect(parseYouTubeCollectionJob(Buffer.from(JSON.stringify(job)), now)).toEqual(job);
    expect(youtubeJobId(job as never)).toEqual(`${job.subscriptionId}:${job.scheduledAt}`);
  });
  it.each([
    'not-json',
    JSON.stringify({ ...job, version: 2 }),
    JSON.stringify({ ...job, subscriptionId: 'not-an-object-id' }),
    JSON.stringify({ ...job, scheduledAt: '2026-10-01T12:00:00Z' }),
    JSON.stringify({ ...job, scheduledAt: '2026-10-16T12:00:00Z' }),
    JSON.stringify({ ...job, cursor: 'forbidden' }),
    'x'.repeat(1025),
  ])('rejects poison or out-of-window jobs: %s', (payload) => {
    expect(() => parseYouTubeCollectionJob(Buffer.from(payload), now)).toThrow();
  });
});
