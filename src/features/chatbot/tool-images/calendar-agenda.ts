import { generateAgendaImage } from '@shared/agenda-image';
import type { AgendaEvent } from '@shared/agenda-image';
import { detectLanguage } from '@shared/image-card';
import type { ToolResult } from '../types';
import type { ToolImageBuilder } from './types';

const CALENDAR_TOOL_NAME = 'calendar';

// Collects the events from every list/upcoming result (single create/update results have no `events` array), de-duplicated by id.
export function selectCalendarEvents(toolResults: readonly ToolResult[]): AgendaEvent[] {
  const seen = new Set<string>();
  return toolResults
    .filter((result) => result.toolName === CALENDAR_TOOL_NAME && Array.isArray(result.data?.events))
    .flatMap((result) => result.data.events)
    .filter((event) => {
      if (!event?.start) return false;
      const key = event.id || `${event.title}|${event.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((event) => ({ title: event.title || '', start: event.start, end: event.end, allDay: Boolean(event.allDay), location: event.location || undefined }));
}

export function buildCalendarAgendaImage(toolResults: readonly ToolResult[], replyText: string): Buffer | null {
  const events = selectCalendarEvents(toolResults);
  if (!events.length) {
    return null;
  }
  return generateAgendaImage(events, { language: detectLanguage(replyText) });
}

export const CALENDAR_AGENDA_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: CALENDAR_TOOL_NAME,
  fileName: 'calendar-agenda.png',
  build: buildCalendarAgendaImage,
};
