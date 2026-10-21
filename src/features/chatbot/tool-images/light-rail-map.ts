import { generateLightRailStationMap, getLightRailTimetable } from '@services/light-rail';
import { detectLanguage } from '@shared/image-card';
import type { ToolResult } from '../types';
import type { ToolImageBuilder } from './types';

const LIGHT_RAIL_TOOL_NAME = 'light_rail';

export function hasLightRailStationMap(toolResults: readonly ToolResult[]): boolean {
  return toolResults.some((result) => result.toolName === LIGHT_RAIL_TOOL_NAME && result.data?.stationMap === true);
}

export async function buildLightRailMapImage(toolResults: readonly ToolResult[], replyText: string): Promise<Buffer | null> {
  if (!hasLightRailStationMap(toolResults)) {
    return null;
  }
  return generateLightRailStationMap(await getLightRailTimetable(), detectLanguage(replyText));
}

export const LIGHT_RAIL_MAP_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: LIGHT_RAIL_TOOL_NAME,
  fileName: 'light-rail-map.png',
  build: buildLightRailMapImage,
};
