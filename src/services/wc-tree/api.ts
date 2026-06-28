import type { WcTreeResult } from './types';
import { fetchWcPlacements } from './wc-tree.adapter';
import { renderWcTree } from './wc-tree.renderer';

// Fetch the live knockout bracket and render the updated tree image.
export async function generateWcTreeImage(): Promise<WcTreeResult> {
  const placements = await fetchWcPlacements();
  if (!placements.length) {
    return { placedCount: placements.length, path: null };
  }
  const path = await renderWcTree(placements);
  return { path, placedCount: placements.length };
}
