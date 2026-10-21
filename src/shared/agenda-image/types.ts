import type { ImageLanguage } from '@shared/image-card';

export type AgendaEvent = {
  readonly title: string;
  // ISO dateTime for timed events, YYYY-MM-DD for all-day events (end is exclusive, like Google Calendar)
  readonly start: string;
  readonly end?: string;
  readonly allDay: boolean;
  readonly location?: string;
};

export type AgendaBlock = {
  readonly event: AgendaEvent;
  readonly startMinute: number;
  readonly endMinute: number;
  readonly column: number;
  readonly columns: number;
};

export type AgendaDay = {
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly allDay: readonly AgendaEvent[];
  readonly blocks: readonly AgendaBlock[];
};

export type AgendaImageOptions = {
  readonly language?: ImageLanguage;
  // Restricts the image to these days (YYYY-MM-DD); defaults to the days the events start on.
  readonly days?: readonly string[];
  readonly now?: Date;
};
