import axios from 'axios';
import { askJevNoul } from './api';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

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
});
