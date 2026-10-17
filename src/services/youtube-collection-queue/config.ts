import { env } from 'node:process';
import type { YouTubeQueueConfig } from './types';

export function readYouTubeQueueConfig(environment: Readonly<Record<string, string | undefined>> = env): YouTubeQueueConfig | null {
  const mode = environment.SOCIAL_MEDIA_COLLECTION_MODE ?? 'direct';
  if (mode === 'direct') return null;
  if (mode !== 'pubsub') throw new Error('SOCIAL_MEDIA_COLLECTION_MODE must be direct or pubsub');

  const projectId = environment.SOCIAL_MEDIA_PUBSUB_PROJECT_ID?.trim();
  if (!projectId) throw new Error('SOCIAL_MEDIA_PUBSUB_PROJECT_ID is required in pubsub mode');

  let credentials: YouTubeQueueConfig['credentials'];
  const credentialsJson = environment.SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON?.trim();
  if (credentialsJson) {
    try {
      const parsed: unknown = JSON.parse(credentialsJson);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('type' in parsed) ||
        parsed.type !== 'service_account' ||
        !('client_email' in parsed) ||
        typeof parsed.client_email !== 'string' ||
        !parsed.client_email.trim() ||
        !('private_key' in parsed) ||
        typeof parsed.private_key !== 'string' ||
        !parsed.private_key.trim()
      ) {
        throw new Error('Invalid service account');
      }
      credentials = { client_email: parsed.client_email, private_key: parsed.private_key };
    } catch {
      throw new Error('SOCIAL_MEDIA_PUBSUB_CREDENTIALS_JSON must be valid service-account JSON with client_email and private_key');
    }
  }

  return {
    projectId,
    topicId: environment.SOCIAL_MEDIA_PUBSUB_TOPIC?.trim() || 'social-media-collection-jobs',
    subscriptionId: environment.SOCIAL_MEDIA_PUBSUB_SUBSCRIPTION?.trim() || 'social-media-collection-worker',
    deadLetterTopicId: environment.SOCIAL_MEDIA_PUBSUB_DLQ_TOPIC?.trim() || 'social-media-collection-jobs-dlq',
    ...(credentials ? { credentials } : {}),
  };
}
