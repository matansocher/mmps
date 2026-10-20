import { loadImage } from 'canvas';
import type { Image } from 'canvas';
import { getErrorMessage, Logger } from '@core/utils';
import { getCompetitionLogoUrl, getTeamLogoUrl } from '@services/scores-365';

const logger = new Logger('sports:logos');

const FETCH_TIMEOUT_MS = 5000;

type LogoKind = 'team' | 'competition';

const LOGO_URL_BUILDERS: Record<LogoKind, (id: number) => string> = {
  team: (id) => getTeamLogoUrl(id),
  competition: (id) => getCompetitionLogoUrl(id),
};

// Logos rarely change, so successful loads are kept for the lifetime of the process.
const logoCache = new Map<string, Promise<Image | null>>();

async function fetchLogo(kind: LogoKind, id: number, cacheKey: string): Promise<Image | null> {
  try {
    const res = await fetch(LOGO_URL_BUILDERS[kind](id), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    logger.warn(`Failed to load ${kind} logo ${id}: ${getErrorMessage(err)}`);
    logoCache.delete(cacheKey);
    return null;
  }
}

function getLogo(kind: LogoKind, id: number): Promise<Image | null> {
  const cacheKey = `${kind}:${id}`;
  if (!logoCache.has(cacheKey)) {
    logoCache.set(cacheKey, fetchLogo(kind, id, cacheKey));
  }
  return logoCache.get(cacheKey);
}

// Missing or failed logos are simply absent from the result.
export async function loadLogos(kind: LogoKind, ids: readonly number[]): Promise<Map<number, Image>> {
  const uniqueIds = [...new Set(ids.filter((id) => id > 0))];
  const logos = await Promise.all(uniqueIds.map((id) => getLogo(kind, id)));
  return new Map(uniqueIds.flatMap((id, index) => (logos[index] ? [[id, logos[index]] as const] : [])));
}
