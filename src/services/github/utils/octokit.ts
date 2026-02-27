import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { env } from 'node:process';

let octokit: Octokit;

function initOctokit(): Octokit {
  if (octokit) return octokit;

  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY env vars are required');
  }

  octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
    },
  });

  return octokit;
}

export function getOctokit(): Octokit {
  return octokit || initOctokit();
}
