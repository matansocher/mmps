import { BITES, CURRICULUM, GUIDES } from './bites.data';
import type { Bite, GuideId } from './types';

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
