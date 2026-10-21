import { readYouTubeQueueConfig } from './config';

describe('readYouTubeQueueConfig()', () => {
  const enabled = { SOCIAL_MEDIA_COLLECTION_MODE: 'pubsub', SOCIAL_MEDIA_PUBSUB_PROJECT_ID: 'pilot-project' };

  test('defaults to direct mode without reading optional credentials', () => {
    expect(readYouTubeQueueConfig({})).toEqual(null);
    expect(readYouTubeQueueConfig({ SOCIAL_MEDIA_COLLECTION_MODE: 'direct', SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON: 'invalid' })).toEqual(null);
  });

  test('reads the process environment by default', () => {
    vi.stubEnv('SOCIAL_MEDIA_COLLECTION_MODE', 'direct');
    try {
      expect(readYouTubeQueueConfig()).toEqual(null);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test.each(['', 'queue', 'PUBSUB'])('rejects unsupported mode %j', (mode) => {
    expect(() => readYouTubeQueueConfig({ SOCIAL_MEDIA_COLLECTION_MODE: mode })).toThrow('SOCIAL_MEDIA_COLLECTION_MODE');
  });

  test.each([undefined, '', '  '])('requires an explicit project ID: %j', (projectId) => {
    expect(() => readYouTubeQueueConfig({ ...enabled, SOCIAL_MEDIA_PUBSUB_PROJECT_ID: projectId })).toThrow('SOCIAL_MEDIA_PUBSUB_PROJECT_ID');
  });

  test('uses social-media resource defaults and leaves ADC credentials automatic', () => {
    expect(readYouTubeQueueConfig({ ...enabled, GOOGLE_APPLICATION_CREDENTIALS: '/not-read/service-account.json' })).toEqual({
      projectId: 'pilot-project',
      topicId: 'social-media-collection-jobs',
      subscriptionId: 'social-media-collection-worker',
      deadLetterTopicId: 'social-media-collection-jobs-dlq',
    });
  });

  test.each(['', '  ', '\n\t'])('uses ADC when credentials JSON is blank: %j', (credentialsJson) => {
    expect(readYouTubeQueueConfig({ ...enabled, SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON: credentialsJson })).not.toHaveProperty('credentials');
  });

  test('accepts resource overrides and explicit service-account credentials', () => {
    const credentials = { type: 'service_account', client_email: 'test@example.invalid', private_key: 'test-only-not-a-real-key' };
    expect(
      readYouTubeQueueConfig({
        ...enabled,
        SOCIAL_MEDIA_PUBSUB_TOPIC: 'custom-jobs',
        SOCIAL_MEDIA_PUBSUB_SUBSCRIPTION: 'custom-worker',
        SOCIAL_MEDIA_PUBSUB_DLQ_TOPIC: 'custom-dlq',
        SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON: JSON.stringify(credentials),
      }),
    ).toEqual({
      projectId: 'pilot-project',
      topicId: 'custom-jobs',
      subscriptionId: 'custom-worker',
      deadLetterTopicId: 'custom-dlq',
      credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
    });
  });

  test.each([
    '{secret-invalid-json',
    'null',
    '[]',
    '{}',
    JSON.stringify({ type: 'authorized_user', client_email: 'test@example.invalid', private_key: 'not-real' }),
    JSON.stringify({ type: 'service_account', client_email: '', private_key: 'not-real' }),
    JSON.stringify({ type: 'service_account', client_email: 'test@example.invalid' }),
    JSON.stringify({ type: 'service_account', client_email: 'test@example.invalid', private_key: 123 }),
  ])('rejects malformed credentials without echoing their content: case %#', (credentials) => {
    expect(() => readYouTubeQueueConfig({ ...enabled, SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON: credentials })).toThrow(
      /^SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON must be valid service-account JSON with client_email and private_key$/,
    );
  });
});
