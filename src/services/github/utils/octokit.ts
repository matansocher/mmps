import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { env } from 'node:process';

let octokit: Octokit;

export function initOctokit(): Octokit {
  if (octokit) return octokit;

  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;
  const installationId = env.GITHUB_APP_INSTALLATION_ID;

  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY env vars are required');
  }

  if (!installationId) {
    throw new Error('GITHUB_APP_INSTALLATION_ID env var is required for repository operations');
  }

  octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });

  return octokit;
}

export function getOctokit(): Octokit {
  return octokit || initOctokit();
}
