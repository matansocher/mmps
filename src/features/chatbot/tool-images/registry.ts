import { getErrorMessage, Logger } from '@core/utils';
import type { ToolResult } from '../types';
import { LEAGUE_TABLE_IMAGE_BUILDER } from './league-table';
import { RAIL_ROUTE_IMAGE_BUILDER } from './rail-route';
import type { ToolImage, ToolImageBuilder } from './types';
import { WEATHER_CHART_IMAGE_BUILDER } from './weather-chart';

const logger = new Logger('ToolImages');

// Images are sent in this order, before the text reply.
export const TOOL_IMAGE_BUILDERS: readonly ToolImageBuilder[] = [RAIL_ROUTE_IMAGE_BUILDER, LEAGUE_TABLE_IMAGE_BUILDER, WEATHER_CHART_IMAGE_BUILDER];

export async function buildToolImages(toolResults: readonly ToolResult[], replyText: string, builders: readonly ToolImageBuilder[] = TOOL_IMAGE_BUILDERS): Promise<ToolImage[]> {
  const images: ToolImage[] = [];
  for (const builder of builders) {
    const results = toolResults.filter((result) => result.toolName === builder.toolName && !result.error);
    if (!results.length) continue;
    try {
      const image = await builder.build(results, replyText);
      if (image) {
        images.push({ fileName: builder.fileName, image });
      }
    } catch (err) {
      logger.error(`Failed to build ${builder.fileName} for ${builder.toolName}: ${getErrorMessage(err)}`);
    }
  }
  return images;
}
