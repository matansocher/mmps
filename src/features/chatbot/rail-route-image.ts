import { generateRouteImage } from '@services/israel-rail';
import type { RouteImageLanguage, TrainTravel } from '@services/israel-rail';
import type { ToolResult } from './types';

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
  const language: RouteImageLanguage = /[\u0590-\u05FF]/.test(replyText) ? 'he' : 'en';
  return generateRouteImage(travels, language);
}
