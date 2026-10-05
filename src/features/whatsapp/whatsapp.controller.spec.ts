import express from 'express';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { handleIncomingMessage } from './sticker-vault.service';
import { registerWhatsappRoutes } from './whatsapp.controller';

vi.mock('./sticker-vault.service', () => ({ handleIncomingMessage: vi.fn(async () => undefined) }));

describe('WhatsApp webhook routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    registerWhatsappRoutes(app);
    app.use(express.json());
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => server.close());

  beforeEach(() => {
    vi.stubEnv('VERIFY_TOKEN', 'verify-me');
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    vi.mocked(handleIncomingMessage).mockClear();
  });

  afterEach(() => vi.unstubAllEnvs());

  describe('GET /whatsapp-webhook', () => {
    it('should echo the challenge when the token matches', async () => {
      const res = await fetch(`${baseUrl}/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`);
      expect(res.status).toEqual(200);
      expect(await res.text()).toEqual('12345');
    });

    test.each([
      { name: 'wrong token', query: 'hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1' },
      { name: 'wrong mode', query: 'hub.mode=unsubscribe&hub.verify_token=verify-me&hub.challenge=1' },
      { name: 'no params', query: '' },
    ])('should return 403 for $name', async ({ query }) => {
      const res = await fetch(`${baseUrl}/whatsapp-webhook?${query}`);
      expect(res.status).toEqual(403);
    });
  });

  describe('POST /whatsapp-webhook', () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: '972500000000', id: '1', timestamp: '0', type: 'text', text: { body: 'hello' } }] } }] }] });
    const post = (headers: Record<string, string> = {}) => fetch(`${baseUrl}/whatsapp-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

    it('should ack and hand a text message to the sticker vault', async () => {
      const res = await post();
      expect(res.status).toEqual(200);
      await vi.waitFor(() => expect(handleIncomingMessage).toHaveBeenCalledWith({ kind: 'text', from: '972500000000', id: '1', text: 'hello' }));
    });

    it('should accept a valid signature when the app secret is set', async () => {
      vi.stubEnv('WHATSAPP_APP_SECRET', 'secret');
      const signature = `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`;
      const res = await post({ 'X-Hub-Signature-256': signature });
      expect(res.status).toEqual(200);
      await vi.waitFor(() => expect(handleIncomingMessage).toHaveBeenCalledTimes(1));
    });

    it('should reject an invalid signature when the app secret is set', async () => {
      vi.stubEnv('WHATSAPP_APP_SECRET', 'secret');
      const res = await post({ 'X-Hub-Signature-256': 'sha256=deadbeef' });
      expect(res.status).toEqual(401);
      expect(handleIncomingMessage).not.toHaveBeenCalled();
    });
  });
});
