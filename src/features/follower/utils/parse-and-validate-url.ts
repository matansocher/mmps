import { PLATFORM_CONFIG } from '@shared/follower';
import type { ParsedChannelUrl } from '../types';
import { parseChannelUrl } from './parse-url';

export async function parseAndValidateUrl(url: string): Promise<ParsedChannelUrl> {
  const parsed = parseChannelUrl(url);

  if (!parsed.isValid) {
    return parsed;
  }

  try {
    const platformConfig = PLATFORM_CONFIG[parsed.platform];
    await platformConfig.getChannelInfo(parsed.channelId);
    return parsed;
  } catch {
    return { ...parsed, isValid: false, error: 'Channel not found' };
  }
}
