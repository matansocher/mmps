import path from 'node:path';
import { COMPETITION_IDS_MAP } from '@services/scores-365';

export const WC_COMPETITION_ID = COMPETITION_IDS_MAP.WORLD_CUP;

export const BASE_IMAGE_PATH = path.resolve(process.cwd(), 'assets', 'images', 'wc-tree.jpg');
export const BUNDLED_HEBREW_FONT_PATH = path.resolve(process.cwd(), 'assets', 'fonts', 'NotoSansHebrew-Bold.ttf');
export const SYSTEM_HEBREW_FONT_PATH = '/System/Library/Fonts/SFHebrew.ttf';
export const OUTPUT_DIR = path.resolve(process.cwd(), 'assets', 'wc-tree');

// 365scores knockout stages -> bracket rounds.
export const STAGE_ROUND: Record<number, 'R16' | 'QF' | 'SF' | 'FINAL'> = { 3: 'R16', 4: 'QF', 5: 'SF', 6: 'FINAL' };

// ---------------------------------------------------------------------------
// Round-of-32 cell geometry — used to copy a team's flag from the base image.
// Left groups (1-8) sit on the far left; right groups (9-16) on the right.
// Each group has a top team (pos 0) and a bottom team (pos 1).
// ---------------------------------------------------------------------------
export const R32_LEFT_FLAG_CX = 44;
export const R32_RIGHT_FLAG_CX = 1130;
export const FLAG_SRC_SIZE = 45;

// ---------------------------------------------------------------------------
// Target slot geometry per round (measured from the base art).
// ---------------------------------------------------------------------------
export const R16 = { vsX: { L: 281, R: 991 }, ys: [278, 451, 604, 772], off: 41, flagDx: 43, nameDx: 55 };
// QF: two tall boxes per side (cy centers); each holds two stacked slots (cy +/- off).
export const QF = { x: { L: 440, R: 829 }, boxCy: [342, 711], off: 31, flagDx: 30, nameDx: 38 };
// SF: one tall box per side; two stacked slots (cy +/- off).
export const SF = { x: { L: 488, R: 781 }, boxCy: 538, off: 33, flagDx: 28, nameDx: 38 };
// Final: top finalist box (left side) and bottom finalist box (right side).
export const FINAL = { x: 636, ys: [380, 577], flagDx: 36, nameDx: 50 };
