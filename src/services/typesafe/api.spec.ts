import axios from 'axios';
import { sleep } from '@core/utils';
import { askJevNoul } from './api';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('@core/utils', () => ({ sleep: vi.fn() }));

describe('askJevNoul()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('TYPESAFE_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw when the API key is missing', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', '');
    await expect(askJevNoul('state', { instructions: 'q?' })).rejects.toThrow('TypeSafe API key not configured');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should send a noul question with bearer auth and return its probability', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { model: 'jev-1.13.0', answers: { answer: { type: 'noul', noul: 0.82 } }, usage: { input_tokens: 1, output_tokens: 1 } } });

    const result = await askJevNoul('some email', { instructions: 'Is this spam?' });

    expect(result).toEqual(0.82);
    const [url, body, config] = vi.mocked(axios.post).mock.calls[0];
    expect(url).toEqual('https://api.typesafe.ai/v1/systemone');
    expect(body).toEqual({ model: 'jev-latest', state: 'some email', questions: { answer: { type: 'noul', instructions: 'Is this spam?' } } });
    expect(config.headers).toEqual({ Authorization: 'Bearer test-key', 'Content-Type': 'application/json' });
  });

  it('should throw when the response has no noul answer', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { answers: {} } });
    await expect(askJevNoul('state', { instructions: 'q?' })).rejects.toThrow('TypeSafe returned no noul answer');
  });

  const okResponse = { data: { answers: { answer: { type: 'noul', noul: 0.4 } } } };

  test.each([{ status: 429 }, { status: 529 }])('should retry once after a $status response', async ({ status }) => {
    vi.mocked(axios.post).mockRejectedValueOnce({ response: { status } }).mockResolvedValueOnce(okResponse);

    await expect(askJevNoul('state', { instructions: 'q?' })).resolves.toEqual(0.4);
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('should give up when the retry also fails', async () => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status: 429 } });

    await expect(askJevNoul('state', { instructions: 'q?' })).rejects.toEqual({ response: { status: 429 } });
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test.each([{ status: 401 }, { status: 500 }])('should not retry a $status response', async ({ status }) => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status } });

    await expect(askJevNoul('state', { instructions: 'q?' })).rejects.toEqual({ response: { status } });
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
