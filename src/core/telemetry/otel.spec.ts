import { env } from 'node:process';
import { buildAuthHeaders } from './otel';

describe('buildAuthHeaders()', () => {
  const original = { id: env.GRAFANA_OTLP_INSTANCE_ID, token: env.GRAFANA_OTLP_TOKEN };

  afterEach(() => {
    env.GRAFANA_OTLP_INSTANCE_ID = original.id;
    env.GRAFANA_OTLP_TOKEN = original.token;
    if (original.id === undefined) delete env.GRAFANA_OTLP_INSTANCE_ID;
    if (original.token === undefined) delete env.GRAFANA_OTLP_TOKEN;
  });

  it('should build a basic auth header from the instance id and token', () => {
    env.GRAFANA_OTLP_INSTANCE_ID = '123456';
    env.GRAFANA_OTLP_TOKEN = 'glc_token+with/special=chars==';

    const expected = `Basic ${Buffer.from('123456:glc_token+with/special=chars==').toString('base64')}`;
    expect(buildAuthHeaders()).toEqual({ Authorization: expected });
  });

  test.each([
    { label: 'the instance id is missing', id: undefined, token: 'token' },
    { label: 'the token is missing', id: '123456', token: undefined },
    { label: 'both are empty', id: '', token: '' },
  ])('should return undefined when $label', ({ id, token }) => {
    delete env.GRAFANA_OTLP_INSTANCE_ID;
    delete env.GRAFANA_OTLP_TOKEN;
    if (id !== undefined) env.GRAFANA_OTLP_INSTANCE_ID = id;
    if (token !== undefined) env.GRAFANA_OTLP_TOKEN = token;

    expect(buildAuthHeaders()).toBeUndefined();
  });
});
