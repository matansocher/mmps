import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from 'node:process';

export function verifyGithubWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) throw new Error('GITHUB_WEBHOOK_SECRET is not configured');

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
