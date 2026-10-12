import express from 'express';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { CAMPAIGN_VERSION, emptyCloudJourney, emptyProgress, mergeJourney } from '@shared/rewind';
import { registerRewindApiRoutes } from './rewind.api.controller';

const mocks = vi.hoisted(() => ({ connect: vi.fn(), get: vi.fn(), sync: vi.fn(), reset: vi.fn() }));
vi.mock('@core/mongo', () => ({ createMongoConnection: mocks.connect }));
vi.mock('../mongo', () => ({ REWIND_DB_NAME: 'Rewind', getProgress: mocks.get, syncProgress: mocks.sync, resetProgress: mocks.reset }));

function signed(userId: number, token = 'rewind-test-token', age = 0) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000) - age), user: JSON.stringify({ id: userId }) });
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

describe('Rewind authenticated API', () => {
  let server: Server;
  let origin: string;
  beforeAll(async () => {
    const app = express();
    registerRewindApiRoutes(app);
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected a local test port');
    origin = `http://127.0.0.1:${address.port}/api/rewind/progress`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REWIND_TELEGRAM_BOT_TOKEN', 'rewind-test-token');
    mocks.connect.mockResolvedValue(undefined);
    mocks.get.mockResolvedValue(emptyCloudJourney());
    mocks.sync.mockImplementation(async (_id, request) => mergeJourney(emptyCloudJourney(), request));
  });
  afterEach(() => vi.unstubAllEnvs());
  test('rejects anonymous visits and production development headers before touching Mongo', async () => {
    for (const headers of [{}, { 'X-Rewind-Dev-User': '123' }]) {
      const result = await fetch(origin, { headers });
      expect(result.status).toEqual(401);
    }
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test.each(['wrong-token', 'rewind-test-token'])('rejects forged or expired Telegram signatures', async (token) => {
    const result = await fetch(origin, { headers: { 'X-Telegram-Init-Data': signed(123, token, token === 'wrong-token' ? 0 : 86401) } });
    expect(result.status).toEqual(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  test('uses the verified Telegram user, never a client-supplied account ID', async () => {
    const result = await fetch(`${origin}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': signed(123) },
      body: JSON.stringify({ campaignVersion: CAMPAIGN_VERSION, userId: 999, epoch: 0, roomRevision: 0, progress: emptyProgress() }),
    });
    expect(result.status).toEqual(200);
    expect(result.headers.get('cache-control')).toEqual('no-store');
    expect(mocks.sync).toHaveBeenCalledWith(123, { campaignVersion: CAMPAIGN_VERSION, epoch: 0, roomRevision: 0, progress: emptyProgress() });
    const second = await fetch(origin, { headers: { 'X-Telegram-Init-Data': signed(456) } });
    expect(second.status).toEqual(200);
    expect(mocks.get).toHaveBeenCalledWith(456);
  });
  test('accepts the Worldly bot when no dedicated Rewind token is configured', async () => {
    vi.stubEnv('REWIND_TELEGRAM_BOT_TOKEN', '');
    vi.stubEnv('WORLDLY_TELEGRAM_BOT_TOKEN', 'worldly-test-token');
    expect((await fetch(origin, { headers: { 'X-Telegram-Init-Data': signed(123, 'worldly-test-token') } })).status).toEqual(200);
  });
  test('allows explicit development identities locally, but never a shared default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect((await fetch(origin)).status).toEqual(401);
    expect((await fetch(origin, { headers: { 'X-Rewind-Dev-User': '123' } })).status).toEqual(200);
    expect((await fetch(origin, { headers: { 'X-Rewind-Dev-User': '-1' } })).status).toEqual(401);
  });
  test('rejects malformed progress rather than writing it', async () => {
    const result = await fetch(`${origin}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': signed(123) }, body: '{"epoch":0,"progress":{}}' });
    expect(result.status).toEqual(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  test('old cached clients cannot write or reset the curated campaign', async () => {
    for (const action of ['sync', 'reset']) {
      const result = await fetch(`${origin}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': signed(123) },
        body: JSON.stringify({ campaignVersion: 1, epoch: 0, roomRevision: 0, progress: emptyProgress() }),
      });
      expect(result.status).toEqual(400);
    }
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  test('reports unavailable Mongo and stale resets explicitly', async () => {
    mocks.connect.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await fetch(origin, { headers: { 'X-Telegram-Init-Data': signed(123) } })).status).toEqual(503);
    mocks.reset.mockResolvedValue(null);
    const result = await fetch(`${origin}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': signed(123) },
      body: JSON.stringify({ campaignVersion: CAMPAIGN_VERSION, epoch: 0 }),
    });
    expect(result.status).toEqual(409);
  });
});
