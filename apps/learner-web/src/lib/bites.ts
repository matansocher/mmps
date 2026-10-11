import { CURRICULUM, GUIDES, BITES as SOURCE_BITES } from './bites.data';
import type { Bite, GuideId } from './types';

const CRUMBS_RE = /^\s*<div class="crumbs">([\s\S]*?)<\/div>/;
const LEADING_H2_RE = /^\s*<h2[^>]*>([\s\S]*?)<\/h2>/;

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// The page renders the title and section chip itself, so drop the guide's own crumbs + duplicated <h2> title.
function normalizeBite(bite: Bite): Bite {
  let html = bite.html.replace(/<div class="next">[\s\S]*?<\/div>/g, '');
  let section: string | undefined;
  const crumbs = html.match(CRUMBS_RE);
  if (crumbs) {
    section = plainText(crumbs[1]) || undefined;
    html = html.slice(crumbs[0].length);
  }
  const heading = html.match(LEADING_H2_RE);
  if (heading && plainText(heading[1]).toLowerCase() === plainText(bite.title).toLowerCase()) html = html.slice(heading[0].length);
  return { ...bite, html: html.trimStart(), section };
}

const BITES = SOURCE_BITES.map(normalizeBite);
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
