export { DB_NAME, EMAIL_EVENTS_COLLECTION } from './constants';
export type { CreateEmailEventData, EmailEvent, EmailEventDetails, EmailEventStatus } from './types';
export { claimEmailEvent, ensureEmailEventIndexes, getEmailEventById, getScannedEmailIds, resolveEmailEvent, saveEmailEvents, setEmailEventMessageId } from './email-event.repository';
export { buildCalendarEvent, buildEventSuggestionText, formatEventWhen } from './email-event.utils';
