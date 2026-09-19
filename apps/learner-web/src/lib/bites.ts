import { CURRICULUM, GUIDES, BITES as SOURCE_BITES } from './bites.data';
import type { Bite, GuideId } from './types';

const BITES = SOURCE_BITES.map((bite) => ({ ...bite, html: bite.html.replace(/<div class="next">[\s\S]*?<\/div>/g, '') }));
const BY_ID = new Map<string, Bite>(BITES.map((b) => [b.id, b]));

export { BITES, CURRICULUM, GUIDES };

export function getBite(id: string): Bite | undefined {
  return BY_ID.get(id);
}

export function bitesByGuide(guide: GuideId): Bite[] {
  return BITES.filter((b) => b.guide === guide);
}

export function curriculumIndex(id: string): number {
  return CURRICULUM.indexOf(id);
}

// The next bite in the same guide ("course"), in curriculum order. Null on the last one.
export function nextBiteInGuide(id: string): Bite | undefined {
  const current = getBite(id);
  if (!current) return undefined;
  const start = curriculumIndex(id);
  if (start === -1) return undefined;
  for (let i = start + 1; i < CURRICULUM.length; i++) {
    const candidate = getBite(CURRICULUM[i]);
    if (candidate && candidate.guide === current.guide) return candidate;
  }
  return undefined;
}
