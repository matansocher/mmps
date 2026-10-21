import { generateRouteImage } from '@services/israel-rail';
import type { TrainTravel } from '@services/israel-rail';
import { detectLanguage } from '@shared/image-card';
import type { ToolResult } from '../types';
import type { ToolImageBuilder } from './types';

const RAIL_TOOL_NAME = 'israel_rail';
const MAX_ROUTES_IN_IMAGE = 3;

// Picks the travels the agent actually mentioned in its reply (by departure time), falling back to the first ones.
export function selectRailTravels(toolResults: readonly ToolResult[], replyText: string): TrainTravel[] {
  const railResult = [...toolResults].reverse().find((result) => result.toolName === RAIL_TOOL_NAME && Array.isArray(result.data?.trains) && result.data.trains.length);
  if (!railResult) {
    return [];
  }

  const travels: TrainTravel[] = railResult.data.trains;
  const mentioned = travels.filter((travel) => replyText.includes(travel.departureTime));
  return (mentioned.length ? mentioned : travels).slice(0, MAX_ROUTES_IN_IMAGE);
}

export function buildRailRouteImage(toolResults: readonly ToolResult[], replyText: string): Buffer | null {
  const travels = selectRailTravels(toolResults, replyText);
  if (!travels.length) {
    return null;
  }
  return generateRouteImage(travels, detectLanguage(replyText));
}

export const RAIL_ROUTE_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: RAIL_TOOL_NAME,
  fileName: 'rail-route.png',
  build: buildRailRouteImage,
};
